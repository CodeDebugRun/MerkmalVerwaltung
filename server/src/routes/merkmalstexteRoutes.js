const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');

// --- CRUD Rotaları ---
// GET: Tüm kayıtları getir (READ)
router.get('/merkmalstexte', controller.getAllMerkmalstexte);

// GET: Filtered results - Legacy merkmalstexte.jsp functionality
router.get('/merkmalstexte/filter', controller.getFilteredMerkmalstexte);

// GET: ID'ye göre tek bir kayıt getir (READ)
router.get('/merkmalstexte/:id', controller.getMerkmalstextById);

// POST: Yeni bir kayıt oluştur (CREATE) - with position shifting
router.post('/merkmalstexte', controller.createMerkmalstext);

// POST: Bulk position update - Legacy merkmalsposition_edit.jsp functionality
router.post('/merkmalstexte/bulk-position', controller.bulkUpdateMerkmalstextePositions);

// PUT: ID'ye göre bir kaydı tamamen güncelle (FULL UPDATE) - with position reordering
router.put('/merkmalstexte/:id', controller.updateMerkmalstext);

// PATCH: ID'ye göre bir kaydı kısmen güncelle (PARTIAL UPDATE)
router.patch('/merkmalstexte/:id', controller.patchMerkmalstext);

// DELETE: ID'ye göre bir kaydı sil (DELETE) - with position shifting
router.delete('/merkmalstexte/:id', controller.deleteMerkmalstext);

module.exports = router;