require('dotenv').config();
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testConcurrency() {
  console.log('🚀 Iniciando prueba de concurrencia...');
  
  // 1. Crear un producto con stock limitado (3 unidades)
  const productRes = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Producto Concurrente',
      slug: `test-concurrency-${Date.now()}`,
      precio: 100,
      stock_actual: 3,
      categoria_id: null
    })
  });
  const { id: productId } = await productRes.json();
  console.log(`📦 Producto creado con ID: ${productId} (Stock: 3)`);

  // 2. Intentar realizar 5 pedidos simultáneos de 1 unidad cada uno
  console.log('🛒 Realizando 5 pedidos simultáneos...');
  
  const orderData = {
    cliente: {
      nombre: 'Test',
      apellido: 'Concurrencia',
      email: 'test@example.com',
      telefono: '123456789'
    },
    items: [{
      producto_id: productId,
      cantidad: 1,
      precio: 100,
      nombre: 'Producto Concurrente'
    }],
    total: 100,
    metodo_pago: 'transferencia'
  };

  const promises = Array(5).fill().map((_, i) => 
    fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }).then(async r => ({
      status: r.status,
      data: await r.json(),
      index: i + 1
    }))
  );

  const results = await Promise.all(promises);

  // 3. Analizar resultados
  let successCount = 0;
  let failCount = 0;

  results.forEach(res => {
    if (res.status === 200 || res.status === 201) {
      successCount++;
      console.log(`✅ Pedido ${res.index}: Éxito`);
    } else {
      failCount++;
      console.log(`❌ Pedido ${res.index}: Falló (${res.data.error})`);
    }
  });

  console.log('\n--- Resumen de Concurrencia ---');
  console.log(`Éxitos: ${successCount} (Esperado: 3)`);
  console.log(`Fallos: ${failCount} (Esperado: 2)`);

  if (successCount === 3) {
    console.log('🏆 PRUEBA PASADA: El bloqueo de stock funciona correctamente.');
  } else {
    console.log('⚠️ PRUEBA FALLIDA: Se vendieron más productos de los disponibles o hubo un error inesperado.');
  }
}

testConcurrency().catch(console.error);
