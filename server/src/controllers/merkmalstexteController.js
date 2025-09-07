const { poolPromise, sql } = require('../db');

// Bütün kayıtları getiren fonksiyon (READ ALL)
const getAllMerkmalstexte = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM merkmalstexte');
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// ID'ye göre tek bir kayıt getiren fonksiyon (READ ONE)
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

// Yeni bir kayıt oluşturan fonksiyon (CREATE)
const createMerkmalstext = async (req, res) => {
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fListe } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('identnr', sql.VarChar, identnr)
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .input('sondermerkmal', sql.VarChar, sondermerkmal || null)
      .input('position', sql.VarChar, position || null)
      .input('sonderAbt', sql.VarChar, sonderAbt || null)
      .input('fListe', sql.VarChar, fListe || null)
      .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fListe) 
              OUTPUT INSERTED.* 
              VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @position, @sonderAbt, @fListe)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Bir kaydı güncelleyen fonksiyon (UPDATE)
const updateMerkmalstext = async (req, res) => {
  const { id } = req.params;
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fListe } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('identnr', sql.VarChar, identnr)
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .input('sondermerkmal', sql.VarChar, sondermerkmal || null)
      .input('position', sql.VarChar, position || null)
      .input('sonderAbt', sql.VarChar, sonderAbt || null)
      .input('fListe', sql.VarChar, fListe || null)
      .query(`UPDATE merkmalstexte 
              SET identnr = @identnr, merkmal = @merkmal, auspraegung = @auspraegung, drucktext = @drucktext,
                  sondermerkmal = @sondermerkmal, position = @position, sonderAbt = @sonderAbt, fListe = @fListe
              OUTPUT INSERTED.*
              WHERE id = @id`);
    
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Bir kaydı kısmen güncelleyen fonksiyon (PATCH)
const patchMerkmalstext = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Güncelleme yapılacak alanları ve değerlerini ayırıyoruz
  const allowedFields = ['identnr', 'merkmal', 'auspraegung', 'drucktext', 'sondermerkmal', 'position', 'sonderAbt', 'fListe'];
  const fieldsToUpdate = Object.keys(updates).filter(field => allowedFields.includes(field));
  
  if (fieldsToUpdate.length === 0) {
    return res.status(400).send('Güncellenecek geçerli bir alan bulunamadı.');
  }
  
  try {
    const pool = await poolPromise;
    let query = 'UPDATE merkmalstexte SET ';
    const setClause = fieldsToUpdate.map(field => `${field} = @${field}`).join(', ');
    query += setClause + ' OUTPUT INSERTED.* WHERE id = @id';
    
    const request = pool.request().input('id', sql.Int, id);
    
    // Her alan için uygun SQL tipini belirliyoruz
    fieldsToUpdate.forEach(field => {
      request.input(field, sql.VarChar, updates[field]);
    });
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).send('Bu ID ile kayıt bulunamadı.');
    }
    
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Bir kaydı silen fonksiyon (DELETE)
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
  patchMerkmalstext,
  deleteMerkmalstext,
};