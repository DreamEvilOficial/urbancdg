require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

async function testProducts() {
  console.log('--- Testing Products ---');
  try {
    // 1. GET products
    console.log('GET /products...');
    const getRes = await fetch(`${API_URL}/products`);
    const products = await getRes.json();
    if (!getRes.ok) throw new Error(products.error || 'Failed to fetch products');
    console.log(`✅ Success: Found ${products.length} products`);

    // 2. POST product
    console.log('POST /products...');
    const newProduct = {
      nombre: 'Producto de Prueba',
      slug: `test-product-${Date.now()}`,
      descripcion: 'Esta es una descripción de prueba',
      precio: 1500.50,
      stock_actual: 10,
      imagenes: ['https://example.com/image.jpg'],
      variantes: [{ talle: 'M', color: 'Azul', stock: 5 }]
    };
    const postRes = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.error || 'Failed to create product');
    console.log('✅ Success:', postData);
    const productId = postData.id;

    // 3. GET product by ID
    console.log(`GET /products?id=${productId}...`);
    const getByIdRes = await fetch(`${API_URL}/products?id=${productId}`);
    const product = await getByIdRes.json();
    if (!getByIdRes.ok) throw new Error(product.error || 'Failed to fetch product by ID');
    console.log('✅ Success:', product.nombre === newProduct.nombre ? 'Data matches' : 'Data mismatch');

    return productId;
  } catch (err) {
    console.error('❌ Error testing products:', err.message);
    return null;
  }
}

async function testOrders(productId) {
  console.log('--- Testing Orders ---');
  try {
    // 1. POST order
    console.log('POST /orders...');
    const newOrder = {
      cliente: {
        nombre: 'Juan Perez',
        email: 'juan@example.com',
        telefono: '123456789'
      },
      items: [
        {
          producto_id: productId,
          cantidad: 1,
          precio_unitario: 1500.50
        }
      ],
      subtotal: 1500.50,
      total: 1500.50,
      metodo_pago: 'transferencia'
    };
    
    const postRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.error || 'Failed to create order');
    console.log('✅ Success:', postData);
  } catch (err) {
    console.error('❌ Error testing orders:', err.message);
  }
}

async function testDebts() {
  console.log('--- Testing Debts ---');
  try {
    const newDebt = {
      cliente_nombre: 'Pedro',
      cliente_apellido: 'Gomez',
      total_deuda: 5000,
      estado: 'pendiente'
    };
    const postRes = await fetch(`${API_URL}/debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDebt)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.error || 'Failed to create debt');
    console.log('✅ Success: Debt created', postData.id);
  } catch (err) {
    console.error('❌ Error testing debts:', err.message);
  }
}

async function testReviews(productId) {
  console.log('--- Testing Reviews ---');
  try {
    const newReview = {
      productoId: productId,
      nombre: 'Maria',
      rating: 5,
      comentario: 'Excelente producto!'
    };
    const postRes = await fetch(`${API_URL}/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReview)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.error || 'Failed to create review');
    console.log('✅ Success: Review created', postData.message);
  } catch (err) {
    console.error('❌ Error testing reviews:', err.message);
  }
}

async function testBanners() {
  console.log('--- Testing Banners ---');
  try {
    const newBanner = {
      tipo: 'hero',
      titulo: 'Oferta de Verano',
      imagen_url: 'https://example.com/banner.jpg',
      activo: true
    };
    const postRes = await fetch(`${API_URL}/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBanner)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.error || 'Failed to create banner');
    console.log('✅ Success: Banner created', postData.id);
  } catch (err) {
    console.error('❌ Error testing banners:', err.message);
  }
}

async function testOperators() {
  console.log('--- Testing Operators ---');
  try {
    const newOperator = {
      nombre: 'Admin Test',
      usuario: `admin_${Date.now()}`,
      contrasena: 'password123',
      rol: 'admin',
      permiso_categorias: true,
      permiso_productos: true,
      permiso_configuracion: true,
      permiso_ordenes: true
    };
    const postRes = await fetch(`${API_URL}/operators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOperator)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.error || 'Failed to create operator');
    console.log('✅ Success: Operator created', postData.id || newOperator.usuario);
  } catch (err) {
    console.error('❌ Error testing operators:', err.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API tests...');
  const productId = await testProducts();
  if (productId) {
    await testOrders(productId);
    await testReviews(productId);
  }
  await testDebts();
  await testBanners();
  await testOperators();
  console.log('🏁 Tests completed.');
}

runTests();
