const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');

// --- CRUD Routen ---
// GET: Gruplandırılmış ana liste - main listing with grouped data
router.get('/merkmalstexte/list-grouped', controller.getGroupedMerkmalstexte);

// GET: Filtered results - Legacy merkmalstexte.jsp functionality
router.get('/merkmalstexte/filter', controller.getFilteredMerkmalstexte);

// GET: Alle Datensätze abrufen (READ)
router.get('/merkmalstexte', controller.getAllMerkmalstexte);

// GET: Check for null ID records
router.get('/merkmalstexte/check/null-ids', controller.checkNullIds);

// GET: Check for duplicate Ident-Nr entries
router.get('/merkmalstexte/check/duplicates', controller.checkDuplicateIdentnrs);

// GET: Count of unique Ident-Nr values
router.get('/merkmalstexte/count/identnrs', controller.getIdentnrCount);

// GET: All unique Ident-Nr values (simple list)
router.get('/merkmalstexte/list/identnrs', controller.getAllIdentnrs);

// POST: Add new custom Ident-Nr to database
router.post('/merkmalstexte/add-identnr', controller.addCustomIdentnr);

// POST: Copy record to multiple Ident-Nr values
router.post('/merkmalstexte/:id/copy-to-identnrs', controller.copyRecordToMultipleIdentnrs);

// GET: All records by Ident-Nr
router.get('/merkmalstexte/identnr/:identnr', controller.getMerkmalstexteByIdentnr);

// POST: Create new record for specific Ident-Nr
router.post('/merkmalstexte/identnr/:identnr', controller.createMerkmalstextForIdentnr);

// DELETE: Delete all records for specific Ident-Nr
router.delete('/merkmalstexte/identnr/:identnr', controller.deleteMerkmalstexteByIdentnr);

// POST: Neuen Datensatz erstellen (CREATE) - with position shifting
router.post('/merkmalstexte', controller.createMerkmalstext);

// POST: Bulk position update - Legacy merkmalsposition_edit.jsp functionality
router.post('/merkmalstexte/bulk-position', controller.bulkUpdateMerkmalstextePositions);

// PUT: Update specific record (full update)
router.put('/merkmalstexte/:id', controller.updateMerkmalstext);

// PATCH: Partial update specific record
router.patch('/merkmalstexte/:id', controller.patchMerkmalstext);

// DELETE: Delete specific record
router.delete('/merkmalstexte/:id', controller.deleteMerkmalstext);

// POST: Bulk delete by group data
router.post('/merkmalstexte/bulk-delete-group', controller.bulkDeleteByGroupData);

// POST: Copy group data for replication
router.post('/merkmalstexte/copy-group', controller.copyGroupData);

// POST: Create new group from copied data
router.post('/merkmalstexte/create-from-copy', controller.createGroupFromCopy);

// GET: Get specific record by ID
router.get('/merkmalstexte/:id', controller.getMerkmalstextById);

// GET: Get similar datasets to a specific record
router.get('/merkmalstexte/:id/similar', controller.getSimilarDatasets);

module.exports = router;