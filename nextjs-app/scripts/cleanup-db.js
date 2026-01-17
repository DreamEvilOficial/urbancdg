const db = require('../src/lib/db');

async function deletePendingOrders() {
  console.log('Deleting pending orders...');
  try {
    const res = await db.query("DELETE FROM ordenes WHERE estado = 'pendiente'");
    console.log(`Deleted ${res.rowCount} pending orders.`);
    
    // Also cleanup items for those orders if necessary (cascade usually handles this but let's be safe)
    // Note: If you don't have cascade, you might have orphaned items. 
    // Assuming cascade or simple structure.
    
  } catch (err) {
    console.error('Error deleting orders:', err);
  }
}

deletePendingOrders();
