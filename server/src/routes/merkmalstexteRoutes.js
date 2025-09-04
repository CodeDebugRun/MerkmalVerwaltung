const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');

// --- CRUD Rotaları ---
// GET: Tüm kayıtları getir (READ)
router.get('/merkmalstexte', controller.getAllMerkmalstexte);

// GET: ID'ye göre tek bir kayıt getir (READ)
router.get('/merkmalstexte/:id', controller.getMerkmalstextById);

// POST: Yeni bir kayıt oluştur (CREATE)
router.post('/merkmalstexte', controller.createMerkmalstext);

// PUT: ID'ye göre bir kaydı tamamen güncelle (FULL UPDATE)
router.put('/merkmalstexte/:id', controller.updateMerkmalstext);

// PATCH: ID'ye göre bir kaydı kısmen güncelle (PARTIAL UPDATE)
router.patch('/merkmalstexte/:id', controller.patchMerkmalstext);

// DELETE: ID'ye göre bir kaydı sil (DELETE)
router.delete('/merkmalstexte/:id', controller.deleteMerkmalstext);

module.exports = router;