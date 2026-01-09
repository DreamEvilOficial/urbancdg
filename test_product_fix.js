
const fetch = require('node-fetch');

async function testProductCreation() {
    console.log('🧪 Iniciando prueba de creación de producto con esquema flexible...');
    
    const productData = {
        nombre: "Producto de Prueba " + Date.now(),
        descripcion: "Prueba de guardado defensivo",
        precio: 99.99,
        stock_actual: 10,
        categoria_id: "c2049d5c-9c76-49f3-a36c-941e73715c02", // ID de prueba (ajustar si es necesario)
        imagenes: ["https://example.com/img1.jpg"],
        variantes: [{ color: "Rojo", stock: 5 }],
        dimensiones: { ancho: 10, alto: 20 },
        sku: "TEST-SKU-" + Date.now(),
        activo: true
    };

    try {
        const response = await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ ÉXITO: El producto se creó correctamente.');
            console.log('📊 Respuesta del servidor:', JSON.stringify(result, null, 2));
        } else {
            console.error('❌ ERROR: Falló la creación del producto.');
            console.error('📊 Detalles:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('❌ ERROR de conexión:', error.message);
    }
}

testProductCreation();
