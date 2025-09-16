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
  console.log('🔍 [DEBUG] getAllMerkmalstexte function started');
  console.log('📥 [DEBUG] Request query parameters:', req.query);
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Extract pagination parameters with defaults and validation
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 25, 100)); // Max 100 per page, default 25
    const offset = (page - 1) * limit;
    
    console.log('📄 [DEBUG] Pagination parameters calculated:');
    console.log('   - Page:', page);
    console.log('   - Limit:', limit);
    console.log('   - Offset:', offset);
    
    // Get total count for pagination metadata
    console.log('🔢 [DEBUG] Executing count query...');
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM merkmalstexte');
    const totalCount = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log('📊 [DEBUG] Count query result:');
    console.log('   - Total records:', totalCount);
    console.log('   - Total pages:', totalPages);
    
    // Get paginated records with proper ordering
    console.log('🗄️ [DEBUG] Executing main data query with pagination...');
    const result = await pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT * FROM merkmalstexte 
        ORDER BY merkmalsposition, identnr, merkmal
        OFFSET @offset ROWS 
        FETCH NEXT @limit ROWS ONLY
      `);
    
    console.log('✅ [DEBUG] Main data query executed successfully');
    console.log('📝 [DEBUG] Records retrieved:', result.recordset.length);
    
    // Felder für das Frontend zuordnen
    console.log('🔄 [DEBUG] Mapping database fields to frontend fields...');
    const recordsWithNewFields = result.recordset.map(record => ({
      ...record,
      // Wir ordnen die tatsächlichen Datenbankspalten den Frontend-Feldern zu
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    console.log('✅ [DEBUG] Field mapping completed');
    
    // Return data with pagination metadata
    console.log('📦 [DEBUG] Preparing response data with pagination metadata...');
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
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] getAllMerkmalstexte function completed successfully');
    res.status(200).json(formatSuccess(responseData, `Seite ${page} von ${totalPages} erfolgreich abgerufen`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in getAllMerkmalstexte:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Funktion zum Abrufen eines einzelnen Datensatzes nach ID (READ ONE)
const getMerkmalstextById = async (req, res, next) => {
  const { id } = req.params;
  console.log('⚡ [DEBUG] *** getMerkmalstextById CALLED with ID:', id);

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
  console.log('🆕 [DEBUG] createMerkmalstext function started');
  console.log('📥 [DEBUG] Request body:', req.body);
  
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  console.log('✅ [DEBUG] Request body destructured successfully');
  
  // Validate input data
  console.log('🔍 [DEBUG] Starting input validation...');
  const validation = validateMerkmalstexte(req.body);
  if (!validation.isValid) {
    console.log('❌ [DEBUG] Validation failed:', validation.errors);
    return res.status(400).json(formatValidationError(validation.errors));
  }
  console.log('✅ [DEBUG] Input validation successful');
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Determine position: use provided position or get next available
    let finalPosition = position ? parseInt(position) : null;
    if (!finalPosition) {
      finalPosition = await getNextAvailablePosition(pool);
    }
    
    // Execute within transaction for data integrity with position shifting
    const result = await withTransaction(pool, async (transaction) => {
      // Validate position uniqueness with row-level locking
      const isPositionUnique = await validatePositionUniqueness(transaction, finalPosition);
      if (!isPositionUnique) {
        finalPosition = await findNextSafePosition(transaction, finalPosition);
        console.log(`🔄 Position angepasst auf: ${finalPosition}`);
      }
      
      // LEGACY LOGIC: Shift existing positions up before inserting
      await shiftPositionsUp(transaction, finalPosition);
      
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
      // LEGACY LOGIC: Handle position reordering if position changed
      if (newPosition && oldPosition && newPosition !== oldPosition) {
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
  console.log('🔍 [DEBUG] checkNullIds function started');
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    console.log('🗄️ [DEBUG] Executing null ID check query...');
    const result = await pool.request()
      .query(`
        SELECT *
        FROM merkmalstexte 
        WHERE id IS NULL
        ORDER BY identnr, merkmal
      `);
    
    console.log('✅ [DEBUG] Null ID check query executed successfully');
    console.log('📝 [DEBUG] Records with null IDs found:', result.recordset.length);
    
    if (result.recordset.length > 0) {
      console.log('⚠️ [DEBUG] Found records with null IDs!');
      result.recordset.forEach((record, index) => {
        console.log(`[${index + 1}] identnr: ${record.identnr}, merkmal: ${record.merkmal}`);
      });
    }
    
    const responseData = {
      nullIdRecords: result.recordset,
      count: result.recordset.length,
      hasNullIds: result.recordset.length > 0
    };
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] checkNullIds function completed successfully');
    res.status(200).json(formatSuccess(responseData, 
      result.recordset.length > 0 
        ? `${result.recordset.length} Datensätze mit NULL-ID gefunden`
        : 'Keine Datensätze mit NULL-ID gefunden'
    ));
  } catch (err) {
    console.log('❌ [DEBUG] Error in checkNullIds:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Check for duplicate Ident-Nr entries
const checkDuplicateIdentnrs = async (req, res, next) => {
  console.log('🔍 [DEBUG] checkDuplicateIdentnrs function started');
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    console.log('🗄️ [DEBUG] Executing duplicate identnr query...');
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
    
    console.log('✅ [DEBUG] Duplicate identnr query executed successfully');
    console.log('📝 [DEBUG] Duplicate identnrs found:', result.recordset.length);
    
    if (result.recordset.length > 0) {
      console.log('⚠️ [DEBUG] Found duplicate Ident-Nr entries!');
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
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] checkDuplicateIdentnrs function completed successfully');
    res.status(200).json(formatSuccess(responseData, 
      result.recordset.length > 0 
        ? `${result.recordset.length} Ident-Nr mit mehreren Datensätzen gefunden`
        : 'Keine doppelten Ident-Nr gefunden - jede Ident-Nr hat nur einen Datensatz'
    ));
  } catch (err) {
    console.log('❌ [DEBUG] Error in checkDuplicateIdentnrs:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Get all records by Ident-Nr
const getMerkmalstexteByIdentnr = async (req, res, next) => {
  console.log('🔍 [DEBUG] getMerkmalstexteByIdentnr function started');
  const { identnr } = req.params;
  console.log('📥 [DEBUG] Request params identnr:', identnr);
  
  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    console.log('🗄️ [DEBUG] Executing get records by identnr query...');
    const result = await pool.request()
      .input('identnr', sql.VarChar, identnr)
      .query(`
        SELECT * FROM merkmalstexte 
        WHERE identnr = @identnr
        ORDER BY merkmalsposition, merkmal
      `);
    
    console.log('✅ [DEBUG] Get records by identnr query executed successfully');
    console.log('📝 [DEBUG] Records found:', result.recordset.length);
    
    // Felder für das Frontend zuordnen
    const recordsWithMappedFields = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] getMerkmalstexteByIdentnr function completed successfully');
    res.status(200).json(formatSuccess(recordsWithMappedFields, 
      `${result.recordset.length} Datensätze für Ident-Nr ${identnr} gefunden`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in getMerkmalstexteByIdentnr:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Create new record for specific Ident-Nr
const createMerkmalstextForIdentnr = async (req, res, next) => {
  console.log('🆕 [DEBUG] createMerkmalstextForIdentnr function started');
  const { identnr } = req.params;
  console.log('📥 [DEBUG] Request params identnr:', identnr);
  console.log('📥 [DEBUG] Request body:', req.body);
  
  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  const { merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  // Validate input data (identnr wird aus params übernommen)
  const dataToValidate = { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste };
  console.log('🔍 [DEBUG] Starting input validation...');
  const validation = validateMerkmalstexte(dataToValidate);
  if (!validation.isValid) {
    console.log('❌ [DEBUG] Validation failed:', validation.errors);
    return res.status(400).json(formatValidationError(validation.errors));
  }
  console.log('✅ [DEBUG] Input validation successful');
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Determine position: use provided position or get next available
    let finalPosition = position ? parseInt(position) : null;
    if (!finalPosition) {
      finalPosition = await getNextAvailablePosition(pool);
    }
    
    // Execute within transaction for data integrity with position shifting
    const result = await withTransaction(pool, async (transaction) => {
      // Validate position uniqueness with row-level locking
      const isPositionUnique = await validatePositionUniqueness(transaction, finalPosition);
      if (!isPositionUnique) {
        finalPosition = await findNextSafePosition(transaction, finalPosition);
        console.log(`🔄 Position angepasst auf: ${finalPosition}`);
      }
      
      // LEGACY LOGIC: Shift existing positions up before inserting
      await shiftPositionsUp(transaction, finalPosition);
      
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
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] createMerkmalstextForIdentnr function completed successfully');
    res.status(201).json(formatSuccess(createdRecord, `Datensatz für Ident-Nr ${identnr} erfolgreich erstellt`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in createMerkmalstextForIdentnr:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Delete all records for specific Ident-Nr
const deleteMerkmalstexteByIdentnr = async (req, res, next) => {
  console.log('🗑️ [DEBUG] deleteMerkmalstexteByIdentnr function started');
  const { identnr } = req.params;
  console.log('📥 [DEBUG] Request params identnr:', identnr);
  
  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      const request = createRequest(transaction);
      
      // Delete all records with this identnr
      console.log('🗄️ [DEBUG] Executing delete query...');
      const deleteResult = await request
        .input('identnr', sql.VarChar, identnr)
        .query('DELETE FROM merkmalstexte WHERE identnr = @identnr');
      
      console.log('✅ [DEBUG] Delete query executed successfully');
      console.log('📊 [DEBUG] Rows affected:', deleteResult.rowsAffected[0]);
      
      return deleteResult;
    });
    
    const deletedCount = result.rowsAffected[0];
    
    if (deletedCount === 0) {
      return res.status(404).json(formatError(`Keine Datensätze für Ident-Nr ${identnr} gefunden`));
    }
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] deleteMerkmalstexteByIdentnr function completed successfully');
    res.status(200).json(formatSuccess(
      { deletedCount }, 
      `${deletedCount} Datensätze für Ident-Nr ${identnr} erfolgreich gelöscht`
    ));
  } catch (err) {
    console.log('❌ [DEBUG] Error in deleteMerkmalstexteByIdentnr:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Get count of unique Ident-Nr values
const getIdentnrCount = async (req, res, next) => {
  console.log('🔢 [DEBUG] getIdentnrCount function started');
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    console.log('🗄️ [DEBUG] Executing count query...');
    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(DISTINCT identnr) as unique_identnr_count,
          COUNT(*) as total_records
        FROM merkmalstexte 
        WHERE identnr IS NOT NULL
      `);
    
    console.log('✅ [DEBUG] Count query executed successfully');
    
    const stats = result.recordset[0];
    
    console.log('📝 [DEBUG] Statistics:');
    console.log(`   - Unique Ident-Nr: ${stats.unique_identnr_count}`);
    console.log(`   - Total Records: ${stats.total_records}`);
    
    const responseData = {
      uniqueIdentnrs: stats.unique_identnr_count,
      totalRecords: stats.total_records,
      avgRecordsPerIdentnr: Math.round(stats.total_records / stats.unique_identnr_count * 100) / 100
    };
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] getIdentnrCount function completed successfully');
    res.status(200).json(formatSuccess(responseData, 
      `${stats.unique_identnr_count} eindeutige Ident-Nr gefunden (${stats.total_records} Datensätze insgesamt)`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in getIdentnrCount:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Get all unique Ident-Nr values (simple list)
const getAllIdentnrs = async (req, res, next) => {
  console.log('🔍 [DEBUG] getAllIdentnrs function started');
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    console.log('🗄️ [DEBUG] Executing all identnrs query...');
    const result = await pool.request()
      .query(`
        SELECT DISTINCT identnr 
        FROM merkmalstexte 
        WHERE identnr IS NOT NULL 
        ORDER BY identnr
      `);
    
    console.log('✅ [DEBUG] All identnrs query executed successfully');
    console.log('📝 [DEBUG] Unique identnrs found:', result.recordset.length);
    
    const identnrs = result.recordset.map(record => record.identnr);
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] getAllIdentnrs function completed successfully');
    res.status(200).json(formatSuccess(identnrs, 
      `${identnrs.length} eindeutige Ident-Nr erfolgreich abgerufen`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in getAllIdentnrs:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Add new custom Ident-Nr to database
const addCustomIdentnr = async (req, res, next) => {
  console.log('🆕 [DEBUG] addCustomIdentnr function started');
  const { identnr } = req.body;
  console.log('📥 [DEBUG] Request body identnr:', identnr);
  
  // Validate input
  if (!identnr || !identnr.trim()) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }
  
  const trimmedIdentnr = identnr.trim();
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Check if identnr already exists
    console.log('🔍 [DEBUG] Checking if identnr already exists...');
    const existsResult = await pool.request()
      .input('identnr', sql.VarChar, trimmedIdentnr)
      .query('SELECT COUNT(*) as count FROM merkmalstexte WHERE identnr = @identnr');
    
    const alreadyExists = existsResult.recordset[0].count > 0;
    
    if (alreadyExists) {
      console.log('⚠️ [DEBUG] Identnr already exists in database');
      return res.status(200).json(formatSuccess(
        { identnr: trimmedIdentnr, existed: true }, 
        `Ident-Nr ${trimmedIdentnr} existiert bereits`
      ));
    }
    
    // Create a placeholder record with minimal data to register the identnr
    console.log('🆕 [DEBUG] Creating placeholder record for new identnr...');
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
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] addCustomIdentnr function completed successfully');
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
    console.log('❌ [DEBUG] Error in addCustomIdentnr:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Copy record to multiple Ident-Nr values
const copyRecordToMultipleIdentnrs = async (req, res, next) => {
  console.log('📋 [DEBUG] copyRecordToMultipleIdentnrs function started');
  const { id } = req.params;
  const { identnrs } = req.body;
  console.log('📥 [DEBUG] Request params id:', id);
  console.log('📥 [DEBUG] Request body identnrs:', identnrs);
  
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
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Get original record
    console.log('🔍 [DEBUG] Getting original record...');
    const originalResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM merkmalstexte WHERE id = @id');
    
    if (originalResult.recordset.length === 0) {
      return res.status(404).json(formatError('Original Datensatz nicht gefunden'));
    }
    
    const originalRecord = originalResult.recordset[0];
    console.log('📝 [DEBUG] Original record found:', originalRecord.identnr);
    
    // Execute within transaction for data integrity
    const results = await withTransaction(pool, async (transaction) => {
      const createdRecords = [];
      
      for (const targetIdentnr of identnrs) {
        // Skip if it's the same as original
        if (targetIdentnr === originalRecord.identnr) {
          console.log(`⏭️ [DEBUG] Skipping same identnr: ${targetIdentnr}`);
          continue;
        }
        
        console.log(`🆕 [DEBUG] Creating copy for identnr: ${targetIdentnr}`);
        
        // Get next available position
        let finalPosition = await getNextAvailablePosition(pool);
        
        // Validate position uniqueness with row-level locking
        const isPositionUnique = await validatePositionUniqueness(transaction, finalPosition);
        if (!isPositionUnique) {
          finalPosition = await findNextSafePosition(transaction, finalPosition);
          console.log(`🔄 Position angepasst auf: ${finalPosition}`);
        }
        
        // Shift existing positions up before inserting
        await shiftPositionsUp(transaction, finalPosition);
        
        const request = createRequest(transaction);
        
        const result = await request
          .input('identnr', sql.VarChar, targetIdentnr)
          .input('merkmal', sql.VarChar, originalRecord.merkmal)
          .input('auspraegung', sql.VarChar, originalRecord.auspraegung)
          .input('drucktext', sql.VarChar, originalRecord.drucktext)
          .input('sondermerkmal', sql.VarChar, originalRecord.sondermerkmal || '')
          .input('merkmalsposition', sql.Int, finalPosition)
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
          console.log(`✅ [DEBUG] Created record ID ${newRecord.id} for identnr: ${targetIdentnr}`);
        }
      }
      
      return createdRecords;
    });
    
    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] copyRecordToMultipleIdentnrs function completed successfully');
    res.status(201).json(formatSuccess({
      originalRecord: originalRecord,
      createdRecords: results,
      copiedToIdentnrs: identnrs.filter(identnr => identnr !== originalRecord.identnr)
    }, `Datensatz in ${results.length} neue Ident-Nr kopiert`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in copyRecordToMultipleIdentnrs:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
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
    const pageSize = Math.max(1, Math.min(parseInt(limit) || 50, 1000)); // Max 1000 per page
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
  console.log('🎯 [DEBUG] *** getGroupedMerkmalstexte CALLED! ***');
  console.log('🔍 [DEBUG] getGroupedMerkmalstexte function started');
  console.log('📥 [DEBUG] Request query parameters:', req.query);

  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');

    // No backend pagination - return all grouped records
    console.log('📄 [DEBUG] Fetching all grouped records without pagination...');

    // Get total count for pagination metadata (grouped data count)
    console.log('🔢 [DEBUG] Executing grouped count query...');
    const countResult = await pool.request().query(`
      WITH GroupedData AS (
        SELECT
          merkmal, auspraegung, drucktext,
          ISNULL(sondermerkmal, '') as sondermerkmal,
          ISNULL(merkmalsposition, 0) as merkmalsposition,
          ISNULL(maka, 0) as maka,
          ISNULL(fertigungsliste, 0) as fertigungsliste
        FROM merkmalstexte
        GROUP BY merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste
      )
      SELECT COUNT(*) as total FROM GroupedData
    `);
    const totalCount = countResult.recordset[0].total;

    console.log('📊 [DEBUG] Grouped count query result:');
    console.log('   - Total grouped records:', totalCount);

    // Get all grouped records without pagination
    console.log('🗄️ [DEBUG] Executing main grouped data query...');
    const result = await pool.request()
      .query(`
        WITH GroupedData AS (
          SELECT
            merkmal, auspraegung, drucktext,
            ISNULL(sondermerkmal, '') as sondermerkmal,
            ISNULL(merkmalsposition, 0) as merkmalsposition,
            ISNULL(maka, 0) as maka,
            ISNULL(fertigungsliste, 0) as fertigungsliste,
            STRING_AGG(identnr, ',') as identnr_list,
            STRING_AGG(CAST(id AS NVARCHAR), ',') as id_list,
            COUNT(*) as record_count,
            MIN(id) as first_id
          FROM merkmalstexte
          GROUP BY merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste
        )
        SELECT * FROM GroupedData
        ORDER BY merkmal, auspraegung, drucktext
      `);

    console.log('✅ [DEBUG] Main grouped data query executed successfully');
    console.log('📝 [DEBUG] Grouped records retrieved:', result.recordset.length);

    // Map fields for frontend compatibility
    console.log('🔄 [DEBUG] Mapping database fields to frontend fields...');
    const recordsWithNewFields = result.recordset.map(record => ({
      id: record.first_id, // Use first ID as primary ID for frontend
      identnr: record.identnr_list, // All identnrs as comma-separated string (hidden in list)
      merkmal: record.merkmal,
      auspraegung: record.auspraegung,
      drucktext: record.drucktext,
      sondermerkmal: record.sondermerkmal,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste,
      // Hidden metadata for inline edit
      _groupData: {
        record_count: record.record_count,
        id_list: record.id_list,
        identnr_list: record.identnr_list
      }
    }));

    console.log('✅ [DEBUG] Field mapping completed');

    // Return data with pagination metadata
    console.log('📦 [DEBUG] Preparing response data...');
    const responseData = {
      data: recordsWithNewFields,
      totalCount: totalCount
    };

    console.log('📤 [DEBUG] Sending successful response...');
    console.log('✅ [DEBUG] getGroupedMerkmalstexte function completed successfully');
    res.status(200).json(formatSuccess(responseData, `${totalCount} gruplandırılmış kayıt erfolgreich abgerufen`));
  } catch (err) {
    console.log('❌ [DEBUG] Error in getGroupedMerkmalstexte:', err.message);
    console.log('🔍 [DEBUG] Error details:', err);
    next(err);
  }
};

// Aynı datensatz'a ait tüm kayıtları getir (merkmal, auspraegung, drucktext aynı olanlar)
const getSimilarDatasets = async (req, res) => {
  const { id } = req.params;

  console.log(`🔍 [DEBUG] getSimilarDatasets function started for ID: ${id}`);

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
    
    console.log(`📊 [DEBUG] Original record data:`, { merkmal, auspraegung, drucktext, sondermerkmal });

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

    console.log(`✅ [DEBUG] Found ${similarRecords.recordset.length} similar records`);

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

    console.log('🔄 [DEBUG] updateGroupedMerkmalstexte called');
    console.log('Original data:', originalData);
    console.log('New data:', newData);
    console.log('Identnrs:', identnrs);

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
  getSimilarDatasets
};