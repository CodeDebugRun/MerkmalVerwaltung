const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');

// --- CRUD Routen ---
// GET: Alle Datensätze abrufen (READ)
router.get('/merkmalstexte', controller.getAllMerkmalstexte);

// GET: Filtered results - Legacy merkmalstexte.jsp functionality
router.get('/merkmalstexte/filter', controller.getFilteredMerkmalstexte);

// GET: Einzelnen Datensatz nach ID abrufen (READ)
router.get('/merkmalstexte/:id', controller.getMerkmalstextById);

// POST: Neuen Datensatz erstellen (CREATE) - with position shifting
router.post('/merkmalstexte', controller.createMerkmalstext);

// POST: Bulk position update - Legacy merkmalsposition_edit.jsp functionality
router.post('/merkmalstexte/bulk-position', controller.bulkUpdateMerkmalstextePositions);

// PUT: Datensatz nach ID vollständig aktualisieren (FULL UPDATE) - with position reordering
router.put('/merkmalstexte/:id', controller.updateMerkmalstext);

// PATCH: Datensatz nach ID teilweise aktualisieren (PARTIAL UPDATE)
router.patch('/merkmalstexte/:id', controller.patchMerkmalstext);

// DELETE: Datensatz nach ID löschen (DELETE) - with position shifting
router.delete('/merkmalstexte/:id', controller.deleteMerkmalstext);

module.exports = router;