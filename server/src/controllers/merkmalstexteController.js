const { poolPromise, sql } = require('../db');

// Bütün kayıtları getiren fonksiyon (READ ALL)
const getAllMerkmalstexte = async (req, res) => {
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
    
    res.status(200).json(recordsWithNewFields);
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
    
    // Frontend için alanları eşleştirelim
    const record = result.recordset[0];
    const recordWithNewFields = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };
    
    res.status(200).json(recordWithNewFields);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Yeni bir kayıt oluşturan fonksiyon (CREATE)
const createMerkmalstext = async (req, res) => {
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('identnr', sql.VarChar, identnr)
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
      .input('merkmalsposition', sql.Int, position ? parseInt(position) : null)
      .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
      .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
      .query(`INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext) 
              VALUES (@identnr, @merkmal, @auspraegung, @drucktext); 
              SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()`);

    console.log('Insert result:', result.recordset);

    // Frontend için yeni alanları ekleyelim
    const record = result.recordset[0];
    const createdRecord = {
      ...record,
      position: record.merkmalsposition || null,
      sonderAbt: record.maka || null,
      fertigungsliste: record.fertigungsliste || null
    };
    res.status(201).json(createdRecord);
  } catch (err) {
    console.error('CREATE Error Details:');
    console.error('Message:', err.message);
    console.error('Number:', err.number);
    console.error('State:', err.state);
    console.error('Class:', err.class);
    console.error('Server:', err.server);
    console.error('Procedure:', err.procName);
    console.error('Line:', err.lineNumber);
    res.status(500).send(err.message);
  }
};

// Bir kaydı güncelleyen fonksiyon (UPDATE)
const updateMerkmalstext = async (req, res) => {
  const { id } = req.params;
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
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
    
    // Frontend için alanları eşleştirelim
    const record = result.recordset[0];
    const updatedRecord = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };
    res.status(200).json(updatedRecord);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Bir kaydı kısmen güncelleyen fonksiyon (PATCH)
const patchMerkmalstext = async (req, res) => {
  const { id } = req.params;
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
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
              WHERE id = @id;
              SELECT * FROM merkmalstexte WHERE id = @id`);
    
    if (result.recordset.length === 0) {
      return res.status(404).send('Bu ID ile kayıt bulunamadı.');
    }
    
    // Frontend için alanları eşleştirelim
    const record = result.recordset[0];
    const patchedRecord = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };
    
    res.status(200).json(patchedRecord);
  } catch (err) {
    console.error('PATCH Error:', err.message);
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