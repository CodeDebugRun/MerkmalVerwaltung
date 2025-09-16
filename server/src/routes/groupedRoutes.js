const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');

// GET: Gruplandırılmış merkmalstexte listesi
router.get('/merkmalstexte', controller.getGroupedMerkmalstexte);

// PUT: Grup bazlı güncelleme
router.put('/merkmalstexte', controller.updateGroupedMerkmalstexte);

module.exports = router;