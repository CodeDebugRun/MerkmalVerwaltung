const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');

// --- CRUD Routes---

// GET: Get all records (READ)
router.get('/merkmalstexte', controller.getAllMerkmalstexte);

// GET: Ein Record kommt bei ID (READ)
router.get('/merkmalstexte/:id', controller.getMerkmalstextById);

// POST: Neue Record (CREATE)
router.post('/merkmalstexte', controller.createMerkmalstext);

// PUT: Update Record (UPDATE)
router.put('/merkmalstexte/:id', controller.updateMerkmalstext);

//  Record Löschen (DELETE)
router.delete('/merkmalstexte/:id', controller.deleteMerkmalstext);


module.exports = router;