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

// Bütün kayıtları getiren fonksiyon (READ ALL) - with pagination support
const getAllMerkmalstexte = async (req, res, next) => {
  console.log('🔍 [DEBUG] getAllMerkmalstexte function started');
  console.log('📥 [DEBUG] Request query parameters:', req.query);
  
  try {
    console.log('📊 [DEBUG] Connecting to database pool...');
    const pool = await poolPromise;
    console.log('✅ [DEBUG] Database pool connection successful');
    
    // Extract pagination parameters with defaults and validation
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 50, 1000)); // Max 1000 per page
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
    
    // Frontend için alanları eşleştirelim
    console.log('🔄 [DEBUG] Mapping database fields to frontend fields...');
    const recordsWithNewFields = result.recordset.map(record => ({
      ...record,
      // Database'deki gerçek sütunları frontend alanlarına eşleştiriyoruz
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