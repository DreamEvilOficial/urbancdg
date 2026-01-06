
async function testCreate() {
  try {
    const res = await fetch('http://localhost:3002/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nombre: 'Test',
        cliente_apellido: 'User',
        cliente_dni: '12345678',
        cliente_celular: '11223344',
        cliente_direccion: 'Test Address'
      })
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testCreate();
