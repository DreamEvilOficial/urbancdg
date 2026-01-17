import db from '@/lib/db';

async function cleanupPendingOrders() {
  console.log('🧹 Iniciando limpieza de órdenes pendientes...');
  try {
    // 1. Obtener IDs de órdenes con estado 'pendiente'
    const pendingOrders = await db.all("SELECT id, numero_orden FROM ordenes WHERE estado = 'pendiente'");
    
    if (pendingOrders.length === 0) {
      console.log('✅ No hay órdenes pendientes para eliminar.');
      return;
    }

    console.log(`🗑️ Encontradas ${pendingOrders.length} órdenes pendientes. Eliminando...`);

    for (const order of pendingOrders) {
      console.log(`- Eliminando orden: ${order.numero_orden} (${order.id})`);
      
      await db.transaction(async (client) => {
        // Eliminar items primero por FK
        await client.query('DELETE FROM orden_items WHERE orden_id = $1', [order.id]);
        // Eliminar orden
        await client.query('DELETE FROM ordenes WHERE id = $1', [order.id]);
      });
    }

    console.log('✨ Limpieza completada con éxito.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

cleanupPendingOrders();
