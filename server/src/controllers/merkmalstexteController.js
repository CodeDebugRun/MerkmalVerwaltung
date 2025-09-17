const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');
const { validateMerkmalstexte, validateId } = require('../utils/validation');
const { withTransaction, createRequest } = require('../utils/transactionHelper');
const { 
  shiftPositionsUp, 
  shiftPositionsDown, 
  reorderPositions, 
  bulkUpdatePositions,
  getNextAvailablePosition, 
  getCurrentPosition,
  validatePositionUniqueness,
  findNextSafePosition
} = require('../utils/positionManager');

// Funktion zum Abrufen aller Datensätze (READ ALL) - mit Pagination-Unterstützung
const getAllMerkmalstexte = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    
    // Extract pagination parameters with defaults and validation
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 25, 100)); // Max 100 per page, default 25
    const offset = (page - 1) * limit;
    
    
    // Get total count for pagination metadata
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM merkmalstexte');
    const totalCount = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get paginated records with proper ordering
    const result = await pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT * FROM merkmalstexte 
        ORDER BY merkmalsposition, identnr, merkmal
        OFFSET @offset ROWS 
        FETCH NEXT @limit ROWS ONLY
      `);
    
    
    // Felder für das Frontend zuordnen
    const recordsWithNewFields = result.recordset.map(record => ({
      ...record,
      // Wir ordnen die tatsächlichen Datenbankspalten den Frontend-Feldern zu
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    
    // Return data with pagination metadata
    const responseData = {
      data: recordsWithNewFields,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
    
    res.status(200).json(formatSuccess(responseData, `Seite ${page} von ${totalPages} erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Abrufen eines einzelnen Datensatzes nach ID (READ ONE)
const getMerkmalstextById = async (req, res, next) => {
  const { id } = req.params;

  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM merkmalstexte WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json(formatError('Datensatz mit dieser ID wurde nicht gefunden'));
    }
    
    // Felder für das Frontend zuordnen
    const record = result.recordset[0];
    const recordWithNewFields = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };
    
    res.status(200).json(formatSuccess(recordWithNewFields, 'Datensatz erfolgreich abgerufen'));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Erstellen eines neuen Datensatzes (CREATE)
const createMerkmalstext = async (req, res, next) => {

  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;


  // Validate input data
  const validation = validateMerkmalstexte(req.body);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  try {
    const pool = await poolPromise;

    // New logic: if position is provided, use it; if empty, use 0
    let finalPosition = position ? parseInt(position) : 0;

    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      // Only do position validation and shifting if position is not 0
      if (finalPosition !== 0) {
        // Validate position uniqueness with row-level locking
        const isPositionUnique = await validatePositionUniqueness(transaction, finalPosition);
        if (!isPositionUnique) {
          finalPosition = await findNextSafePosition(transaction, finalPosition);
          console.log(`🔄 Position angepasst auf: ${finalPosition}`);
        }

        // Shift existing positions up before inserting
        await shiftPositionsUp(transaction, finalPosition);
      }

      const request = createRequest(transaction);
      
      return await request
        .input('identnr', sql.VarChar, identnr)
        .input('merkmal', sql.VarChar, merkmal)
        .input('auspraegung', sql.VarChar, auspraegung)
        .input('drucktext', sql.VarChar, drucktext)
        .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
        .input('merkmalsposition', sql.Int, finalPosition)
        .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
        .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
        .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste) 
                VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste); 
                SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()`);
    });

    // Neue Felder für das Frontend hinzufügen
    const record = result.recordset[0];
    const createdRecord = {
      ...record,
      position: record.merkmalsposition || null,
      sonderAbt: record.maka || null,
      fertigungsliste: record.fertigungsliste || null
    };
    res.status(201).json(formatSuccess(createdRecord, 'Datensatz erfolgreich erstellt'));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Aktualisieren eines Datensatzes (UPDATE)
const updateMerkmalstext = async (req, res, next) => {
  const { id } = req.params;
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }
  
  // Validate input data
  const validation = validateMerkmalstexte(req.body);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }
  
  try {
    const pool = await poolPromise;
    
    // Get current position for reordering logic
    const oldPosition = await getCurrentPosition(pool, id);
    const newPosition = position ? parseInt(position) : null;
    
    // Execute within transaction for data integrity with position reordering
    const result = await withTransaction(pool, async (transaction) => {
      // DISABLED: Handle position reordering if position changed (causes issues with bulk updates)
      // Group updates should maintain same position for all records
      const shouldReorder = false; // Disable reordering for now
      if (shouldReorder && newPosition && oldPosition && newPosition !== oldPosition) {
        await reorderPositions(transaction, id, oldPosition, newPosition);
        
        // After reordering, just update other fields (position already set)
        const request = createRequest(transaction);
        return await request
          .input('id', sql.Int, id)
          .input('identnr', sql.VarChar, identnr)
          .input('merkmal', sql.VarChar, merkmal)
          .input('auspraegung', sql.VarChar, auspraegung)
          .input('drucktext', sql.VarChar, drucktext)
          .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
          .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
          .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
          .query(`UPDATE merkmalstexte 
                  SET identnr = @identnr, merkmal = @merkmal, auspraegung = @auspraegung, drucktext = @drucktext, 
                      sondermerkmal = @sondermerkmal, maka = @maka, fertigungsliste = @fertigungsliste
                  OUTPUT INSERTED.*
                  WHERE id = @id`);
      } else {
        // No position change, regular update
        const request = createRequest(transaction);
        return await request
          .input('id', sql.Int, id)
          .input('identnr', sql.VarChar, identnr)
          .input('merkmal', sql.VarChar, merkmal)
          .input('auspraegung', sql.VarChar, auspraegung)
          .input('drucktext', sql.VarChar, drucktext)
          .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
          .input('merkmalsposition', sql.Int, newPosition)
          .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
          .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
          .query(`UPDATE merkmalstexte 
                  SET identnr = @identnr, merkmal = @merkmal, auspraegung = @auspraegung, drucktext = @drucktext, 
                      sondermerkmal = @sondermerkmal, merkmalsposition = @merkmalsposition, maka = @maka, fertigungsliste = @fertigungsliste
                  OUTPUT INSERTED.*
                  WHERE id = @id`);
      }
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json(formatError('Datensatz mit dieser ID wurde nicht gefunden'));
    }
    
    // Felder für das Frontend zuordnen
    const record = result.recordset[0];
    const updatedRecord = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };
    res.status(200).json(formatSuccess(updatedRecord, 'Datensatz erfolgreich aktualisiert'));
  } catch (err) {
    next(err);
  }
};

// Funktion zum teilweisen Aktualisieren eines Datensatzes (PATCH)
const patchMerkmalstext = async (req, res, next) => {
  const { id } = req.params;
  const updateFields = req.body;
  
  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }
  
  // For PATCH, we skip validation since we're only updating provided fields
  // The validation will be handled by database constraints
  
  try {
    const pool = await poolPromise;
    
    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      // First, get the current record
      const getCurrentRequest = createRequest(transaction);
      const currentResult = await getCurrentRequest
        .input('id', sql.Int, id)
        .query('SELECT * FROM merkmalstexte WHERE id = @id');
        
      if (currentResult.recordset.length === 0) {
        throw new Error('Datensatz mit dieser ID wurde nicht gefunden');
      }
      
      // Build dynamic UPDATE query for only provided fields
      let setParts = [];
      const request = createRequest(transaction);
      
      // Map frontend field names to database field names and add to query if provided
      const fieldMappings = {
        identnr: 'identnr',
        merkmal: 'merkmal', 
        auspraegung: 'auspraegung',
        drucktext: 'drucktext',
        sondermerkmal: 'sondermerkmal',
        position: 'merkmalsposition',
        sonderAbt: 'maka',
        fertigungsliste: 'fertigungsliste'
      };
      
      Object.entries(updateFields).forEach(([frontendField, value]) => {
        const dbField = fieldMappings[frontendField];
        if (dbField && value !== undefined) {
          setParts.push(`${dbField} = @${frontendField}`);
          
          // Handle different data types
          if (frontendField === 'position' || frontendField === 'sonderAbt' || frontendField === 'fertigungsliste') {
            request.input(frontendField, sql.Int, value ? parseInt(value) : null);
          } else {
            request.input(frontendField, sql.VarChar, value || '');
          }
        }
      });
      
      if (setParts.length === 0) {
        throw new Error('Keine gültigen Felder zum Aktualisieren bereitgestellt');
      }
      
      // Execute update with only the provided fields
      request.input('id', sql.Int, id);
      const updateQuery = `
        UPDATE merkmalstexte 
        SET ${setParts.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;
      
      return await request.query(updateQuery);
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json(formatError('Datensatz mit dieser ID wurde nicht gefunden'));
    }
    
    // Felder für das Frontend zuordnen
    const record = result.recordset[0];
    const patchedRecord = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };
    
    res.status(200).json(formatSuccess(patchedRecord, 'Datensatz erfolgreich teilweise aktualisiert'));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Löschen eines Datensatzes (DELETE)
const deleteMerkmalstext = async (req, res, next) => {
  const { id } = req.params;
  
  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }
  
  try {
    const pool = await poolPromise;
    
    // Get position before deletion for shifting logic
    const positionToDelete = await getCurrentPosition(pool, id);
    
    // Execute within transaction for data integrity with position shifting
    const result = await withTransaction(pool, async (transaction) => {
      const request = createRequest(transaction);
      
      // Delete the record
      const deleteResult = await request
        .input('id', sql.Int, id)
        .query('DELETE FROM merkmalstexte WHERE id = @id');
      
      // LEGACY LOGIC: Shift positions down after deletion
      if (deleteResult.rowsAffected[0] > 0 && positionToDelete) {
        await shiftPositionsDown(transaction, positionToDelete);
      }
      
      return deleteResult;
    });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json(formatError('Datensatz mit dieser ID wurde nicht gefunden'));
    }
    
    res.status(200).json(formatSuccess(null, 'Datensatz erfolgreich gelöscht'));
  } catch (err) {
    next(err);
  }
};


// Bulk position editing - Legacy merkmalsposition_edit.jsp functionality
const bulkUpdateMerkmalstextePositions = async (req, res, next) => {
  const { identnr, merkmal, newPosition } = req.body;
  
  // Validate required fields
  if (!identnr || !merkmal) {
    return res.status(400).json(formatValidationError(['Identnr und Merkmal sind erforderlich für Bulk-Position-Update']));
  }
  
  if (!newPosition || newPosition <= 0) {
    return res.status(400).json(formatValidationError(['Neue Position muss eine gültige Zahl größer 0 sein']));
  }
  
  try {
    const pool = await poolPromise;
    
    // Execute bulk position update within transaction
    await withTransaction(pool, async (transaction) => {
      await bulkUpdatePositions(transaction, identnr, merkmal, parseInt(newPosition));
    });
    
    res.status(200).json(formatSuccess(null, `Bulk-Position-Update erfolgreich für ${identnr}/${merkmal}`));
  } catch (err) {
    next(err);
  }
};

// Check for null ID records
const checkNullIds = async (req, res, next) => {
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT *
        FROM merkmalstexte 
        WHERE id IS NULL
        ORDER BY identnr, merkmal
      `);
    
    
    if (result.recordset.length > 0) {
      result.recordset.forEach((record, index) => {
        console.log(`[${index + 1}] identnr: ${record.identnr}, merkmal: ${record.merkmal}`);
      });
    }
    
    const responseData = {
      nullIdRecords: result.recordset,
      count: result.recordset.length,
      hasNullIds: result.recordset.length > 0
    };
    
    res.status(200).json(formatSuccess(responseData, 
      result.recordset.length > 0 
        ? `${result.recordset.length} Datensätze mit NULL-ID gefunden`
        : 'Keine Datensätze mit NULL-ID gefunden'
    ));
  } catch (err) {
    next(err);
  }
};

// Check for duplicate Ident-Nr entries
const checkDuplicateIdentnrs = async (req, res, next) => {
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT 
          identnr, 
          COUNT(*) as record_count,
          MIN(id) as first_id,
          MAX(id) as last_id
        FROM merkmalstexte 
        WHERE identnr IS NOT NULL 
        GROUP BY identnr
        HAVING COUNT(*) > 1
        ORDER BY record_count DESC, identnr
      `);
    
    
    if (result.recordset.length > 0) {
      result.recordset.forEach((record, index) => {
        console.log(`[${index + 1}] ${record.identnr}: ${record.record_count} kayıt - ID aralığı: ${record.first_id}-${record.last_id}`);
      });
    }
    
    // Tüm Ident-Nr'ların istatistiklerini de al
    const statsResult = await pool.request()
      .query(`
        SELECT 
          COUNT(DISTINCT identnr) as unique_identnrs,
          COUNT(*) as total_records,
          AVG(CAST(record_counts.record_count AS FLOAT)) as avg_records_per_identnr
        FROM (
          SELECT identnr, COUNT(*) as record_count
          FROM merkmalstexte 
          WHERE identnr IS NOT NULL 
          GROUP BY identnr
        ) as record_counts
      `);
    
    const stats = statsResult.recordset[0];
    
    const responseData = {
      duplicates: result.recordset,
      duplicateCount: result.recordset.length,
      hasDuplicates: result.recordset.length > 0,
      stats: {
        uniqueIdentnrs: stats.unique_identnrs,
        totalRecords: stats.total_records,
        duplicateIdentnrs: result.recordset.length,
        avgRecordsPerIdentnr: Math.round(stats.avg_records_per_identnr * 100) / 100
      }
    };
    
    res.status(200).json(formatSuccess(responseData, 
      result.recordset.length > 0 
        ? `${result.recordset.length} Ident-Nr mit mehreren Datensätzen gefunden`
        : 'Keine doppelten Ident-Nr gefunden - jede Ident-Nr hat nur einen Datensatz'
    ));
  } catch (err) {
    next(err);
  }
};

// Get all records by Ident-Nr
const getMerkmalstexteByIdentnr = async (req, res, next) => {
  const { identnr } = req.params;
  
  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('identnr', sql.VarChar, identnr)
      .query(`
        SELECT * FROM merkmalstexte 
        WHERE identnr = @identnr
        ORDER BY merkmalsposition, merkmal
      `);
    
    
    // Felder für das Frontend zuordnen
    const recordsWithMappedFields = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    res.status(200).json(formatSuccess(recordsWithMappedFields, 
      `${result.recordset.length} Datensätze für Ident-Nr ${identnr} gefunden`));
  } catch (err) {
    next(err);
  }
};

// Create new record for specific Ident-Nr
const createMerkmalstextForIdentnr = async (req, res, next) => {
  const { identnr } = req.params;
  
  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  const { merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  // Validate input data (identnr wird aus params übernommen)
  const dataToValidate = { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste };
  const validation = validateMerkmalstexte(dataToValidate);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }
  
  try {
    const pool = await poolPromise;

    // New logic: if position is provided, use it; if empty, use 0
    let finalPosition = position ? parseInt(position) : 0;

    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      // Only do position validation and shifting if position is not 0
      if (finalPosition !== 0) {
        // Validate position uniqueness with row-level locking
        const isPositionUnique = await validatePositionUniqueness(transaction, finalPosition);
        if (!isPositionUnique) {
          finalPosition = await findNextSafePosition(transaction, finalPosition);
          console.log(`🔄 Position angepasst auf: ${finalPosition}`);
        }

        // Shift existing positions up before inserting
        await shiftPositionsUp(transaction, finalPosition);
      }
      
      const request = createRequest(transaction);
      
      return await request
        .input('identnr', sql.VarChar, identnr) // Params'dan alınan identnr kullan
        .input('merkmal', sql.VarChar, merkmal)
        .input('auspraegung', sql.VarChar, auspraegung)
        .input('drucktext', sql.VarChar, drucktext)
        .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
        .input('merkmalsposition', sql.Int, finalPosition)
        .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
        .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
        .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste) 
                VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste); 
                SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()`);
    });

    // Neue Felder für das Frontend hinzufügen
    const record = result.recordset[0];
    const createdRecord = {
      ...record,
      position: record.merkmalsposition || null,
      sonderAbt: record.maka || null,
      fertigungsliste: record.fertigungsliste || null
    };
    
    res.status(201).json(formatSuccess(createdRecord, `Datensatz für Ident-Nr ${identnr} erfolgreich erstellt`));
  } catch (err) {
    next(err);
  }
};

// Delete all records for specific Ident-Nr
const deleteMerkmalstexteByIdentnr = async (req, res, next) => {
  const { identnr } = req.params;
  
  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  try {
    const pool = await poolPromise;
    
    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      const request = createRequest(transaction);
      
      // Delete all records with this identnr
      const deleteResult = await request
        .input('identnr', sql.VarChar, identnr)
        .query('DELETE FROM merkmalstexte WHERE identnr = @identnr');
      
      
      return deleteResult;
    });
    
    const deletedCount = result.rowsAffected[0];
    
    if (deletedCount === 0) {
      return res.status(404).json(formatError(`Keine Datensätze für Ident-Nr ${identnr} gefunden`));
    }
    
    res.status(200).json(formatSuccess(
      { deletedCount }, 
      `${deletedCount} Datensätze für Ident-Nr ${identnr} erfolgreich gelöscht`
    ));
  } catch (err) {
    next(err);
  }
};

// Get count of unique Ident-Nr values
const getIdentnrCount = async (req, res, next) => {
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(DISTINCT identnr) as unique_identnr_count,
          COUNT(*) as total_records
        FROM merkmalstexte 
        WHERE identnr IS NOT NULL
      `);
    
    
    const stats = result.recordset[0];
    
    
    const responseData = {
      uniqueIdentnrs: stats.unique_identnr_count,
      totalRecords: stats.total_records,
      avgRecordsPerIdentnr: Math.round(stats.total_records / stats.unique_identnr_count * 100) / 100
    };
    
    res.status(200).json(formatSuccess(responseData, 
      `${stats.unique_identnr_count} eindeutige Ident-Nr gefunden (${stats.total_records} Datensätze insgesamt)`));
  } catch (err) {
    next(err);
  }
};

// Get all unique Ident-Nr values (simple list)
const getAllIdentnrs = async (req, res, next) => {
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT DISTINCT identnr 
        FROM merkmalstexte 
        WHERE identnr IS NOT NULL 
        ORDER BY identnr
      `);
    
    
    const identnrs = result.recordset.map(record => record.identnr);
    
    res.status(200).json(formatSuccess(identnrs, 
      `${identnrs.length} eindeutige Ident-Nr erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};

// Add new custom Ident-Nr to database
const addCustomIdentnr = async (req, res, next) => {
  const { identnr } = req.body;
  
  // Validate input
  if (!identnr || !identnr.trim()) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  const trimmedIdentnr = identnr.trim();
  
  try {
    const pool = await poolPromise;
    
    // Check if identnr already exists
    const existsResult = await pool.request()
      .input('identnr', sql.VarChar, trimmedIdentnr)
      .query('SELECT COUNT(*) as count FROM merkmalstexte WHERE identnr = @identnr');
    
    const alreadyExists = existsResult.recordset[0].count > 0;
    
    if (alreadyExists) {
      return res.status(200).json(formatSuccess(
        { identnr: trimmedIdentnr, existed: true }, 
        `Ident-Nr ${trimmedIdentnr} existiert bereits`
      ));
    }
    
    // Create a placeholder record with minimal data to register the identnr
    const result = await withTransaction(pool, async (transaction) => {
      // Get next available position
      let finalPosition = await getNextAvailablePosition(pool);
      
      // Validate position uniqueness
      const isPositionUnique = await validatePositionUniqueness(transaction, finalPosition);
      if (!isPositionUnique) {
        finalPosition = await findNextSafePosition(transaction, finalPosition);
        console.log(`🔄 Position angepasst auf: ${finalPosition}`);
      }
      
      // Shift existing positions up before inserting
      await shiftPositionsUp(transaction, finalPosition);
      
      const request = createRequest(transaction);
      
      return await request
        .input('identnr', sql.VarChar, trimmedIdentnr)
        .input('merkmal', sql.VarChar, 'PLACEHOLDER')
        .input('auspraegung', sql.VarChar, 'PLACEHOLDER')
        .input('drucktext', sql.VarChar, 'PLACEHOLDER - Bitte bearbeiten')
        .input('sondermerkmal', sql.VarChar, '')
        .input('merkmalsposition', sql.Int, finalPosition)
        .input('maka', sql.Int, null)
        .input('fertigungsliste', sql.Int, 0)
        .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste) 
                VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste); 
                SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()`);
    });
    
    const createdRecord = result.recordset[0];
    
    res.status(201).json(formatSuccess({
      identnr: trimmedIdentnr,
      existed: false,
      placeholderRecord: {
        ...createdRecord,
        position: createdRecord.merkmalsposition,
        sonderAbt: createdRecord.maka,
        fertigungsliste: createdRecord.fertigungsliste
      }
    }, `Neue Ident-Nr ${trimmedIdentnr} erfolgreich hinzugefügt (Platzhalter-Datensatz erstellt)`));
  } catch (err) {
    next(err);
  }
};

// Copy record to multiple Ident-Nr values
const copyRecordToMultipleIdentnrs = async (req, res, next) => {
  const { id } = req.params;
  const { identnrs } = req.body;
  
  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }
  
  // Validate identnrs array
  if (!identnrs || !Array.isArray(identnrs) || identnrs.length === 0) {
    return res.status(400).json(formatValidationError(['Ident-Nr array ist erforderlich und darf nicht leer sein']));
  }
  
  try {
    const pool = await poolPromise;
    
    // Get original record
    const originalResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM merkmalstexte WHERE id = @id');
    
    if (originalResult.recordset.length === 0) {
      return res.status(404).json(formatError('Original Datensatz nicht gefunden'));
    }
    
    const originalRecord = originalResult.recordset[0];
    
    // Execute within transaction for data integrity
    const results = await withTransaction(pool, async (transaction) => {
      const createdRecords = [];

      // Use original record's position for all copies (same merkmal/auspraegung should have same position)
      const originalPosition = originalRecord.merkmalsposition || 0;

      for (const targetIdentnr of identnrs) {
        // Skip if it's the same as original
        if (targetIdentnr === originalRecord.identnr) {
          continue;
        }

        
        const request = createRequest(transaction);
        
        const result = await request
          .input('identnr', sql.VarChar, targetIdentnr)
          .input('merkmal', sql.VarChar, originalRecord.merkmal)
          .input('auspraegung', sql.VarChar, originalRecord.auspraegung)
          .input('drucktext', sql.VarChar, originalRecord.drucktext)
          .input('sondermerkmal', sql.VarChar, originalRecord.sondermerkmal || '')
          .input('merkmalsposition', sql.Int, originalPosition)
          .input('maka', sql.Int, originalRecord.maka)
          .input('fertigungsliste', sql.Int, originalRecord.fertigungsliste)
          .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
                  VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
                  SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()`);

        if (result.recordset.length > 0) {
          const newRecord = result.recordset[0];
          createdRecords.push({
            ...newRecord,
            position: newRecord.merkmalsposition,
            sonderAbt: newRecord.maka,
            fertigungsliste: newRecord.fertigungsliste
          });
        }
      }
      
      return createdRecords;
    });
    
    res.status(201).json(formatSuccess({
      originalRecord: originalRecord,
      createdRecords: results,
      copiedToIdentnrs: identnrs.filter(identnr => identnr !== originalRecord.identnr)
    }, `Datensatz in ${results.length} neue Ident-Nr kopiert`));
  } catch (err) {
    next(err);
  }
};

// Advanced filtering endpoint - Legacy merkmalstexte.jsp functionality
const getFilteredMerkmalstexte = async (req, res, next) => {
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste, quickSearch, page, limit } = req.query;
  
  try {
    const pool = await poolPromise;
    const request = pool.request();
    
    // Extract pagination parameters with defaults and validation
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.max(1, Math.min(parseInt(limit) || 50, 500000)); // Max 500000 per page
    const offset = (currentPage - 1) * pageSize;
    
    // Build dynamic WHERE clause
    let whereConditions = [];
    
    // Quick search - searches across multiple fields
    if (quickSearch) {
      const searchTerm = `%${quickSearch}%`;
      whereConditions.push(`(
        identnr LIKE @quickSearch OR 
        merkmal LIKE @quickSearch OR 
        auspraegung LIKE @quickSearch OR 
        drucktext LIKE @quickSearch OR 
        sondermerkmal LIKE @quickSearch
      )`);
      request.input('quickSearch', sql.VarChar, searchTerm);
    } else {
      // Individual field filters (only if no quickSearch)
      if (identnr) {
        whereConditions.push('identnr LIKE @identnr');
        request.input('identnr', sql.VarChar, `%${identnr}%`);
      }
      
      if (merkmal) {
        whereConditions.push('merkmal LIKE @merkmal');
        request.input('merkmal', sql.VarChar, `%${merkmal}%`);
      }
      
      if (auspraegung) {
        whereConditions.push('auspraegung LIKE @auspraegung');
        request.input('auspraegung', sql.VarChar, `%${auspraegung}%`);
      }
      
      if (drucktext) {
        whereConditions.push('drucktext LIKE @drucktext');
        request.input('drucktext', sql.VarChar, `%${drucktext}%`);
      }
      
      if (sondermerkmal) {
        whereConditions.push('sondermerkmal LIKE @sondermerkmal');
        request.input('sondermerkmal', sql.VarChar, `%${sondermerkmal}%`);
      }
      
      if (position) {
        whereConditions.push('merkmalsposition = @position');
        request.input('position', sql.Int, parseInt(position));
      }
      
      if (sonderAbt) {
        whereConditions.push('maka = @sonderAbt');
        request.input('sonderAbt', sql.Int, parseInt(sonderAbt));
      }
      
      if (fertigungsliste) {
        whereConditions.push('fertigungsliste = @fertigungsliste');
        request.input('fertigungsliste', sql.Int, parseInt(fertigungsliste));
      }
    }
    
    const whereClause = whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : '';
    
    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM merkmalstexte${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalCount = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Add pagination parameters to the request
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);
    
    // Build paginated query
    const query = `
      SELECT * FROM merkmalstexte
      ${whereClause}
      ORDER BY merkmalsposition, identnr, merkmal
      OFFSET @offset ROWS 
      FETCH NEXT @pageSize ROWS ONLY
    `;
    
    const result = await request.query(query);
    
    // Map fields for frontend compatibility
    const recordsWithMappedFields = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    // Return data with pagination metadata
    const responseData = {
      data: recordsWithMappedFields,
      pagination: {
        currentPage: currentPage,
        totalPages: totalPages,
        totalCount: totalCount,
        pageSize: pageSize,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      }
    };
    
    res.status(200).json(formatSuccess(responseData, `Seite ${currentPage} von ${totalPages} (${totalCount} gefilterte Datensätze)`));
  } catch (err) {
    next(err);
  }
};

// Get grouped datasets for main listing - gruplandırılmış ana liste
const getGroupedMerkmalstexte = async (req, res, next) => {

  try {
    const pool = await poolPromise;

    // No backend pagination - return all grouped records

    // Get total count for pagination metadata (grouped data count)
    const countResult = await pool.request().query(`
      WITH GroupedData AS (
        SELECT
          merkmal, auspraegung, drucktext,
          merkmalsposition, maka,
          CASE
            WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
            THEN 'EMPTY'
            ELSE sondermerkmal
          END as normalized_sondermerkmal,
          CASE
            WHEN fertigungsliste IS NULL OR fertigungsliste = 0
            THEN 'EMPTY'
            ELSE CAST(fertigungsliste AS NVARCHAR)
          END as normalized_fertigungsliste
        FROM merkmalstexte
        GROUP BY
          merkmal, auspraegung, drucktext, merkmalsposition, maka,
          CASE
            WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
            THEN 'EMPTY'
            ELSE sondermerkmal
          END,
          CASE
            WHEN fertigungsliste IS NULL OR fertigungsliste = 0
            THEN 'EMPTY'
            ELSE CAST(fertigungsliste AS NVARCHAR)
          END
      )
      SELECT COUNT(*) as total FROM GroupedData
    `);
    const totalCount = countResult.recordset[0].total;


    // Get all grouped records without pagination
    const result = await pool.request()
      .query(`
        WITH GroupedData AS (
          SELECT
            merkmal, auspraegung, drucktext,
            merkmalsposition, maka,
            CASE
              WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
              THEN 'EMPTY'
              ELSE sondermerkmal
            END as normalized_sondermerkmal,
            CASE
              WHEN fertigungsliste IS NULL OR fertigungsliste = 0
              THEN 'EMPTY'
              ELSE CAST(fertigungsliste AS NVARCHAR)
            END as normalized_fertigungsliste,
            STRING_AGG(identnr, ',') as identnr_list,
            STRING_AGG(CAST(id AS NVARCHAR), ',') as id_list,
            COUNT(*) as record_count,
            MIN(id) as first_id
          FROM merkmalstexte
          GROUP BY
            merkmal, auspraegung, drucktext, merkmalsposition, maka,
            CASE
              WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
              THEN 'EMPTY'
              ELSE sondermerkmal
            END,
            CASE
              WHEN fertigungsliste IS NULL OR fertigungsliste = 0
              THEN 'EMPTY'
              ELSE CAST(fertigungsliste AS NVARCHAR)
            END
        )
        SELECT
          first_id,
          merkmal,
          auspraegung,
          drucktext,
          CASE WHEN normalized_sondermerkmal = 'EMPTY' THEN '' ELSE normalized_sondermerkmal END as sondermerkmal,
          CASE WHEN normalized_fertigungsliste = 'EMPTY' THEN 0 ELSE CAST(normalized_fertigungsliste AS INT) END as fertigungsliste,
          merkmalsposition,
          maka,
          identnr_list,
          id_list,
          record_count
        FROM GroupedData
        ORDER BY merkmal, auspraegung, drucktext
      `);


    // Map fields for frontend compatibility
    const recordsWithNewFields = result.recordset.map(record => ({
      id: record.first_id, // Use first ID as primary ID for frontend
      identnr: record.identnr_list, // All identnrs as comma-separated string (hidden in list)
      merkmal: record.merkmal,
      auspraegung: record.auspraegung,
      drucktext: record.drucktext,
      sondermerkmal: record.sondermerkmal || '',
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste || 0,
      // Hidden metadata for inline edit
      _groupData: {
        record_count: record.record_count,
        id_list: record.id_list,
        identnr_list: record.identnr_list
      }
    }));


    // Return data with pagination metadata
    const responseData = {
      data: recordsWithNewFields,
      totalCount: totalCount
    };

    res.status(200).json(formatSuccess(responseData, `${totalCount} gruplandırılmış kayıt erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};

// Aynı datensatz'a ait tüm kayıtları getir (merkmal, auspraegung, drucktext aynı olanlar)
const getSimilarDatasets = async (req, res) => {
  const { id } = req.params;


  try {
    const pool = await poolPromise;
    
    // Önce ilgili kaydın bilgilerini al
    const originalRecord = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT merkmal, auspraegung, drucktext, sondermerkmal FROM merkmalstexte WHERE id = @id');

    if (originalRecord.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı'
      });
    }

    const { merkmal, auspraegung, drucktext, sondermerkmal } = originalRecord.recordset[0];
    

    // Aynı datensatz'a ait tüm kayıtları bul
    const similarRecords = await pool.request()
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
      .query(`
        SELECT id, identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste 
        FROM merkmalstexte 
        WHERE merkmal = @merkmal 
          AND auspraegung = @auspraegung 
          AND drucktext = @drucktext 
          AND ISNULL(sondermerkmal, '') = @sondermerkmal
        ORDER BY identnr, merkmalsposition
      `);


    res.json({
      success: true,
      data: {
        originalId: parseInt(id),
        records: similarRecords.recordset,
        count: similarRecords.recordset.length
      },
      timestamp: new Date().toISOString(),
      message: `${similarRecords.recordset.length} adet benzer kayıt bulundu`
    });

  } catch (err) {
    console.error('❌ [ERROR] getSimilarDatasets error:', err);
    res.status(500).json({
      success: false,
      message: 'Benzer kayıtlar alınırken bir hata oluştu',
      error: err.message
    });
  }
};

// Update grouped records - updates all records in the group
const updateGroupedMerkmalstexte = async (req, res, next) => {
  try {
    const {
      originalData,  // Original group data to identify which records to update
      newData,       // New data to update with
      identnrs       // Array of identnrs that should be in this group
    } = req.body;


    const pool = await poolPromise;

    // Start a transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // First, delete all existing records for this group
      await transaction.request()
        .input('merkmal', sql.NVarChar, originalData.merkmal)
        .input('auspraegung', sql.NVarChar, originalData.auspraegung)
        .input('drucktext', sql.NVarChar, originalData.drucktext)
        .input('sondermerkmal', sql.NVarChar, originalData.sondermerkmal || '')
        .input('position', sql.Int, originalData.position)
        .input('sonderAbt', sql.Int, originalData.sonderAbt)
        .input('fertigungsliste', sql.Int, originalData.fertigungsliste)
        .query(`
          DELETE FROM VarTextKZTable
          WHERE merkmal = @merkmal
            AND auspraegung = @auspraegung
            AND drucktext = @drucktext
            AND ISNULL(sondermerkmal, '') = @sondermerkmal
            AND merkmalsposition = @position
            AND maka = @sonderAbt
            AND fertigungsliste = @fertigungsliste
        `);

      // Then insert new records for each identnr
      for (const identnr of identnrs) {
        await transaction.request()
          .input('identnr', sql.NVarChar, identnr)
          .input('merkmal', sql.NVarChar, newData.merkmal)
          .input('auspraegung', sql.NVarChar, newData.auspraegung)
          .input('drucktext', sql.NVarChar, newData.drucktext)
          .input('sondermerkmal', sql.NVarChar, newData.sondermerkmal || '')
          .input('position', sql.Int, newData.position || 0)
          .input('sonderAbt', sql.Int, newData.sonderAbt || 0)
          .input('fertigungsliste', sql.Int, newData.fertigungsliste || 0)
          .query(`
            INSERT INTO VarTextKZTable (
              identnr, merkmal, auspraegung, drucktext,
              sondermerkmal, merkmalsposition, maka, fertigungsliste
            ) VALUES (
              @identnr, @merkmal, @auspraegung, @drucktext,
              @sondermerkmal, @position, @sonderAbt, @fertigungsliste
            )
          `);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `${identnrs.length} Datensätze erfolgreich aktualisiert`,
        timestamp: new Date().toISOString()
      });

    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }

  } catch (err) {
    console.error('❌ [ERROR] updateGroupedMerkmalstexte error:', err);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Gruppendaten',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Bulk delete by group data - delete all records with same merkmal/auspraegung/drucktext
const bulkDeleteByGroupData = async (req, res, next) => {

  const { merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;

  // Validate required fields
  if (!merkmal || !auspraegung || !drucktext) {
    return res.status(400).json(formatValidationError(['Merkmal, Ausprägung und Drucktext sind erforderlich']));
  }

  try {
    const pool = await poolPromise;

    const result = await withTransaction(pool, async (transaction) => {
      const request = createRequest(transaction);

      // Build WHERE clause for group matching
      const whereConditions = ['merkmal = @merkmal', 'auspraegung = @auspraegung', 'drucktext = @drucktext'];

      request.input('merkmal', sql.VarChar, merkmal)
             .input('auspraegung', sql.VarChar, auspraegung)
             .input('drucktext', sql.VarChar, drucktext);

      // Add optional fields to WHERE clause if provided
      if (sondermerkmal !== undefined) {
        whereConditions.push('ISNULL(sondermerkmal, \'\') = @sondermerkmal');
        request.input('sondermerkmal', sql.VarChar, sondermerkmal || '');
      }

      if (position !== undefined) {
        whereConditions.push('ISNULL(merkmalsposition, 0) = @position');
        request.input('position', sql.Int, parseInt(position) || 0);
      }

      if (sonderAbt !== undefined) {
        whereConditions.push('ISNULL(maka, 0) = @sonderAbt');
        request.input('sonderAbt', sql.Int, parseInt(sonderAbt) || 0);
      }

      if (fertigungsliste !== undefined) {
        whereConditions.push('ISNULL(fertigungsliste, 0) = @fertigungsliste');
        request.input('fertigungsliste', sql.Int, parseInt(fertigungsliste) || 0);
      }

      const whereClause = whereConditions.join(' AND ');

      // First, get count of records to be deleted
      const countQuery = `SELECT COUNT(*) as count FROM merkmalstexte WHERE ${whereClause}`;
      const countResult = await request.query(countQuery);
      const recordCount = countResult.recordset[0].count;


      if (recordCount === 0) {
        return { deletedCount: 0, message: 'Keine passenden Datensätze gefunden' };
      }

      // Delete all matching records
      const deleteQuery = `DELETE FROM merkmalstexte WHERE ${whereClause}`;
      const deleteResult = await request.query(deleteQuery);
      const deletedCount = deleteResult.rowsAffected[0];


      return { deletedCount, recordCount };
    });

    const { deletedCount, message } = result;

    if (message) {
      return res.status(404).json(formatError(message));
    }


    res.status(200).json(formatSuccess(
      { deletedCount },
      `${deletedCount} Datensätze der Gruppe erfolgreich gelöscht`
    ));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllMerkmalstexte,
  getMerkmalstextById,
  createMerkmalstext,
  updateMerkmalstext,
  patchMerkmalstext,
  deleteMerkmalstext,
  bulkUpdateMerkmalstextePositions,
  getFilteredMerkmalstexte,
  getGroupedMerkmalstexte,
  updateGroupedMerkmalstexte,
  checkNullIds,
  checkDuplicateIdentnrs,
  getMerkmalstexteByIdentnr,
  createMerkmalstextForIdentnr,
  deleteMerkmalstexteByIdentnr,
  getIdentnrCount,
  getAllIdentnrs,
  addCustomIdentnr,
  copyRecordToMultipleIdentnrs,
  getSimilarDatasets,
  bulkDeleteByGroupData
};