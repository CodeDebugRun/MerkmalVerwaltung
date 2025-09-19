const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');

// Get all identnrs
const getAllIdentnrs = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT DISTINCT identnr
      FROM merkmalstexte
      WHERE identnr IS NOT NULL
      ORDER BY identnr
    `);

    const identnrs = result.recordset.map(row => row.identnr);
    res.status(200).json(formatSuccess(identnrs, `${identnrs.length} Identnrs gefunden`));
  } catch (err) {
    next(err);
  }
};

// Get identnr count
const getIdentnrCount = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT COUNT(DISTINCT identnr) as count
      FROM merkmalstexte
      WHERE identnr IS NOT NULL
    `);

    res.status(200).json(formatSuccess({ count: result.recordset[0].count }, 'Identnr Anzahl ermittelt'));
  } catch (err) {
    next(err);
  }
};

// Get all records for a specific identnr
const getMerkmalstexteByIdentnr = async (req, res, next) => {
  const { identnr } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('identnr', sql.NVarChar, identnr)
      .query(`
        SELECT * FROM merkmalstexte
        WHERE identnr = @identnr
        ORDER BY merkmalsposition
      `);

    res.status(200).json(formatSuccess(result.recordset, `${result.recordset.length} Datensätze für Identnr "${identnr}" gefunden`));
  } catch (err) {
    next(err);
  }
};

// Clone all records from source identnr to target identnr
const cloneIdentnr = async (req, res, next) => {
  const { sourceIdentnr, targetIdentnr } = req.body;

  // Validate required fields
  if (!sourceIdentnr || !targetIdentnr) {
    return res.status(400).json(formatValidationError(['Source Identnr und Target Identnr sind erforderlich']));
  }

  if (sourceIdentnr === targetIdentnr) {
    return res.status(400).json(formatValidationError(['Source und Target Identnr dürfen nicht identisch sein']));
  }

  try {
    const pool = await poolPromise;

    // Check if target identnr already has records
    const checkResult = await pool.request()
      .input('targetIdentnr', sql.NVarChar, targetIdentnr)
      .query('SELECT COUNT(*) as count FROM merkmalstexte WHERE identnr = @targetIdentnr');

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json(formatError(`Target Identnr "${targetIdentnr}" hat bereits Datensätze. Bitte wählen Sie eine andere Identnr.`));
    }

    // Get all records from source identnr
    const sourceResult = await pool.request()
      .input('sourceIdentnr', sql.NVarChar, sourceIdentnr)
      .query(`
        SELECT merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste
        FROM merkmalstexte
        WHERE identnr = @sourceIdentnr
        ORDER BY merkmalsposition
      `);

    if (sourceResult.recordset.length === 0) {
      return res.status(404).json(formatError(`Source Identnr "${sourceIdentnr}" nicht gefunden oder hat keine Datensätze`));
    }

    // Clone all records to target identnr in a transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const clonedRecords = [];

      for (const record of sourceResult.recordset) {
        const request = new sql.Request(transaction);
        const insertResult = await request
          .input('targetIdentnr', sql.NVarChar, targetIdentnr)
          .input('merkmal', sql.NVarChar, record.merkmal)
          .input('auspraegung', sql.NVarChar, record.auspraegung)
          .input('drucktext', sql.NVarChar, record.drucktext)
          .input('sondermerkmal', sql.NVarChar, record.sondermerkmal || '')
          .input('merkmalsposition', sql.Int, record.merkmalsposition)
          .input('maka', sql.Int, record.maka || 0)
          .input('fertigungsliste', sql.Int, record.fertigungsliste || 0)
          .query(`
            INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
            VALUES (@targetIdentnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
            SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
          `);

        if (insertResult.recordset && insertResult.recordset.length > 0) {
          clonedRecords.push(insertResult.recordset[0]);
        }
      }

      await transaction.commit();

      res.status(201).json(formatSuccess({
        sourceIdentnr,
        targetIdentnr,
        clonedRecords,
        recordCount: clonedRecords.length
      }, `${clonedRecords.length} Datensätze erfolgreich von "${sourceIdentnr}" zu "${targetIdentnr}" geklont`));

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    next(err);
  }
};

// Delete all records for a specific identnr
const deleteIdentnr = async (req, res, next) => {
  const { identnr } = req.params;

  try {
    const pool = await poolPromise;

    // First check if identnr exists
    const checkResult = await pool.request()
      .input('identnr', sql.NVarChar, identnr)
      .query('SELECT COUNT(*) as count FROM merkmalstexte WHERE identnr = @identnr');

    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json(formatError(`Identnr "${identnr}" nicht gefunden`));
    }

    const deleteResult = await pool.request()
      .input('identnr', sql.NVarChar, identnr)
      .query('DELETE FROM merkmalstexte WHERE identnr = @identnr');

    res.status(200).json(formatSuccess({
      deletedCount: deleteResult.rowsAffected[0]
    }, `Alle Datensätze für Identnr "${identnr}" erfolgreich gelöscht`));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllIdentnrs,
  getIdentnrCount,
  getMerkmalstexteByIdentnr,
  cloneIdentnr,
  deleteIdentnr
};