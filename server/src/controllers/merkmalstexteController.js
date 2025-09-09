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

// Bütün kayıtları getiren fonksiyon (READ ALL)
const getAllMerkmalstexte = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM merkmalstexte');
    
    // Frontend için alanları eşleştirelim
    const recordsWithNewFields = result.recordset.map(record => ({
      ...record,
      // Database'deki gerçek sütunları frontend alanlarına eşleştiriyoruz
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    res.status(200).json(formatSuccess(recordsWithNewFields, 'Merkmalstexte erfolgreich abgerufen'));
  } catch (err) {
    next(err);
  }
};

// ID'ye göre tek bir kayıt getiren fonksiyon (READ ONE)
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
    
    // Frontend için alanları eşleştirelim
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

// Yeni bir kayıt oluşturan fonksiyon (CREATE)
const createMerkmalstext = async (req, res, next) => {
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  // Validate input data
  const validation = validateMerkmalstexte(req.body);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }
  
  try {
    const pool = await poolPromise;
    
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

    // Frontend için yeni alanları ekleyelim
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

// Bir kaydı güncelleyen fonksiyon (UPDATE)
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
    
    // Frontend için alanları eşleştirelim
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

// Bir kaydı kısmen güncelleyen fonksiyon (PATCH)
const patchMerkmalstext = async (req, res, next) => {
  const { id } = req.params;
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }
  
  // Validate input data (partial update)
  const validation = validateMerkmalstexte(req.body, true);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }
  
  try {
    const pool = await poolPromise;
    
    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      const request = createRequest(transaction);
      
      return await request
        .input('id', sql.Int, id)
        .input('identnr', sql.VarChar, identnr)
        .input('merkmal', sql.VarChar, merkmal)
        .input('auspraegung', sql.VarChar, auspraegung)
        .input('drucktext', sql.VarChar, drucktext)
        .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
        .input('merkmalsposition', sql.Int, position ? parseInt(position) : null)
        .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
        .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
        .query(`UPDATE merkmalstexte 
                SET identnr = @identnr, merkmal = @merkmal, auspraegung = @auspraegung, drucktext = @drucktext,
                    sondermerkmal = @sondermerkmal, merkmalsposition = @merkmalsposition, maka = @maka, fertigungsliste = @fertigungsliste
                OUTPUT INSERTED.*
                WHERE id = @id`);
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json(formatError('Datensatz mit dieser ID wurde nicht gefunden'));
    }
    
    // Frontend için alanları eşleştirelim
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

// Bir kaydı silen fonksiyon (DELETE)
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

// Advanced filtering endpoint - Legacy merkmalstexte.jsp functionality
const getFilteredMerkmalstexte = async (req, res, next) => {
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.query;
  
  try {
    const pool = await poolPromise;
    const request = pool.request();
    
    // Build dynamic WHERE clause
    let whereConditions = [];
    let queryParams = [];
    
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
    
    // Build final query
    let query = 'SELECT * FROM merkmalstexte';
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    query += ' ORDER BY merkmalsposition, identnr, merkmal';
    
    const result = await request.query(query);
    
    // Map fields for frontend compatibility
    const recordsWithMappedFields = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));
    
    res.status(200).json(formatSuccess(recordsWithMappedFields, `${recordsWithMappedFields.length} gefilterte Datensätze gefunden`));
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
  getFilteredMerkmalstexte
};