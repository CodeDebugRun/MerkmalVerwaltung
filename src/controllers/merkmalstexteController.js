const { poolPromise, sql } = require('../db');

// READ ALL
const getAllMerkmalstexte = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM merkmalstexte');
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// READ ONE
const getMerkmalstextById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM merkmalstexte WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).send('Bu ID ile kayıt bulunamadı.');
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// CREATE
const createMerkmalstext = async (req, res) => {
  const { identnr, merkmal, auspraegung, drucktext } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('identnr', sql.VarChar, identnr)
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext) 
              OUTPUT INSERTED.* 
              VALUES (@identnr, @merkmal, @auspraegung, @drucktext)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE
const updateMerkmalstext = async (req, res) => {
  const { id } = req.params;
  const { identnr, merkmal, auspraegung, drucktext } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('identnr', sql.VarChar, identnr)
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .query(`UPDATE merkmalstexte 
              SET identnr = @identnr, merkmal = @merkmal, auspraegung = @auspraegung, drucktext = @drucktext 
              OUTPUT INSERTED.*
              WHERE id = @id`);
    
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// DELETE
const deleteMerkmalstext = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM merkmalstexte WHERE id = @id');
    
    res.status(200).send('Kayıt başarıyla silindi.');
  } catch (err) {
    res.status(500).send(err.message);
  }
};


module.exports = {
  getAllMerkmalstexte,
  getMerkmalstextById,
  createMerkmalstext,
  updateMerkmalstext,
  deleteMerkmalstext,
};