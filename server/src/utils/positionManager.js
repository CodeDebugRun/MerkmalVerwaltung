/**
 * Position management utilities for merkmalstexte
 * Replicates legacy JSP system position shifting logic
 */

const { sql } = require('../db');

/**
 * Shift positions up when inserting a new record
 * Legacy: UPDATE merkmalstexte SET merkmalsposition = merkmalsposition + 1 WHERE merkmalsposition >= ?
 */
const shiftPositionsUp = async (transaction, newPosition) => {
  if (!newPosition || newPosition <= 0) {
    return; // No shifting needed for null or invalid positions
  }

  const request = new sql.Request(transaction);
  
  await request
    .input('position', sql.Int, newPosition)
    .query(`
      UPDATE merkmalstexte 
      SET merkmalsposition = merkmalsposition + 1 
      WHERE merkmalsposition >= @position
    `);
  
  console.log(`🔄 Positionen >= ${newPosition} um 1 nach oben verschoben`);
};

/**
 * Shift positions down when deleting a record
 * Fills gaps in position sequence
 */
const shiftPositionsDown = async (transaction, deletedPosition) => {
  if (!deletedPosition || deletedPosition <= 0) {
    return;
  }

  const request = new sql.Request(transaction);
  
  await request
    .input('position', sql.Int, deletedPosition)
    .query(`
      UPDATE merkmalstexte 
      SET merkmalsposition = merkmalsposition - 1 
      WHERE merkmalsposition > @position
    `);
    
  console.log(`🔄 Positionen > ${deletedPosition} um 1 nach unten verschoben`);
};

/**
 * Reorder positions when moving a record
 * Handles position changes between records
 */
const reorderPositions = async (transaction, recordId, oldPosition, newPosition) => {
  if (!oldPosition || !newPosition || oldPosition === newPosition) {
    return;
  }

  const request = new sql.Request(transaction);

  if (newPosition > oldPosition) {
    // Moving down: shift up records between old and new position
    await request
      .input('oldPos', sql.Int, oldPosition)
      .input('newPos', sql.Int, newPosition)
      .input('recordId', sql.Int, recordId)
      .query(`
        UPDATE merkmalstexte 
        SET merkmalsposition = merkmalsposition - 1 
        WHERE merkmalsposition > @oldPos 
        AND merkmalsposition <= @newPos 
        AND id != @recordId
      `);
  } else {
    // Moving up: shift down records between new and old position
    await request
      .input('oldPos', sql.Int, oldPosition)
      .input('newPos', sql.Int, newPosition)
      .input('recordId', sql.Int, recordId)
      .query(`
        UPDATE merkmalstexte 
        SET merkmalsposition = merkmalsposition + 1 
        WHERE merkmalsposition >= @newPos 
        AND merkmalsposition < @oldPos 
        AND id != @recordId
      `);
  }

  // Update the record to its new position
  const updateRequest = new sql.Request(transaction);
  await updateRequest
    .input('id', sql.Int, recordId)
    .input('position', sql.Int, newPosition)
    .query(`
      UPDATE merkmalstexte 
      SET merkmalsposition = @position 
      WHERE id = @id
    `);
    
  console.log(`🔄 Datensatz ${recordId} von Position ${oldPosition} zu ${newPosition} verschoben`);
};

/**
 * Bulk update positions for records with same identnr + merkmal
 * Replicates legacy merkmalsposition_edit.jsp functionality
 */
const bulkUpdatePositions = async (transaction, identnr, merkmal, newPosition) => {
  const request = new sql.Request(transaction);
  
  // Get all records with this identnr + merkmal
  const existingRecords = await request
    .input('identnr', sql.VarChar, identnr)
    .input('merkmal', sql.VarChar, merkmal)
    .query(`
      SELECT id, merkmalsposition 
      FROM merkmalstexte 
      WHERE identnr = @identnr AND merkmal = @merkmal
      ORDER BY merkmalsposition
    `);

  if (existingRecords.recordset.length === 0) {
    return;
  }

  // Shift positions to make room for the bulk update
  if (newPosition && newPosition > 0) {
    await shiftPositionsUp(transaction, newPosition);
    
    // Update all records with same identnr + merkmal to sequential positions
    for (let i = 0; i < existingRecords.recordset.length; i++) {
      const record = existingRecords.recordset[i];
      const assignedPosition = newPosition + i;
      
      const updateRequest = new sql.Request(transaction);
      await updateRequest
        .input('id', sql.Int, record.id)
        .input('position', sql.Int, assignedPosition)
        .query(`
          UPDATE merkmalstexte 
          SET merkmalsposition = @position 
          WHERE id = @id
        `);
    }
    
    console.log(`🔄 Bulk-Update: ${existingRecords.recordset.length} Datensätze für ${identnr}/${merkmal} ab Position ${newPosition}`);
  }
};

/**
 * Get next available position
 * Ensures proper position assignment
 */
const getNextAvailablePosition = async (pool) => {
  const request = new sql.Request(pool);
  
  const result = await request.query(`
    SELECT ISNULL(MAX(merkmalsposition), 0) + 1 as nextPosition 
    FROM merkmalstexte
  `);
  
  return result.recordset[0].nextPosition;
};

/**
 * Get current position of a record
 */
const getCurrentPosition = async (pool, recordId) => {
  const request = new sql.Request(pool);
  
  const result = await request
    .input('id', sql.Int, recordId)
    .query(`
      SELECT merkmalsposition 
      FROM merkmalstexte 
      WHERE id = @id
    `);
    
  return result.recordset.length > 0 ? result.recordset[0].merkmalsposition : null;
};

module.exports = {
  shiftPositionsUp,
  shiftPositionsDown,
  reorderPositions,
  bulkUpdatePositions,
  getNextAvailablePosition,
  getCurrentPosition
};