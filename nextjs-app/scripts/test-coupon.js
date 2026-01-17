// const fetch = require('node-fetch'); // Native fetch in Node 18+

const BASE_URL = 'http://localhost:3000/api';

async function testCouponFlow() {
  console.log('🧪 Starting Coupon Flow Test...');

  // 1. Create a Coupon
  const couponCode = `TEST-${Date.now()}`;
  const couponData = {
    codigo: couponCode,
    descripcion: 'Test Coupon',
    tipo: 'fijo',
    valor: 100,
    minimo_compra: 500,
    max_uso_total: 10,
    valido_desde: new Date().toISOString(),
    valido_hasta: new Date(Date.now() + 86400000).toISOString(), // +1 day
    activo: true,
    config: { specific_products: [] }
  };

  console.log(`\n📝 Creating coupon: ${couponCode}...`);
  try {
    const createRes = await fetch(`${BASE_URL}/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponData)
    });

    const createJson = await createRes.json();
    console.log('Create Response:', createRes.status, createJson);

    if (!createRes.ok) {
      console.error('❌ Failed to create coupon');
      // Continue to test validation anyway to check endpoint health
    } else {
      console.log('✅ Coupon created successfully');
    }

    // 2. Validate the Coupon
    console.log(`\n🔍 Validating coupon: ${couponCode}...`);
    const validateData = {
      code: couponCode,
      cartTotal: 1000, // Should be valid (> 500)
      items: []
    };

    const validateRes = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST', // or GET depending on implementation, usually POST for validation with cart data
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validateData)
    });

    const validateJson = await validateRes.json();
    console.log('Validate Response:', validateRes.status, validateJson);

    if (validateJson.valid) {
      console.log('✅ Coupon is valid');
    } else {
      console.error('❌ Coupon validation failed:', validateJson.message);
    }

    // 3. Test Invalid Case (Min Purchase)
    console.log(`\n🔍 Testing invalid case (Min Purchase)...`);
    const invalidValidateData = {
      code: couponCode,
      cartTotal: 100, // Should be invalid (< 500)
      items: []
    };

    const invalidRes = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidValidateData)
    });

    const invalidJson = await invalidRes.json();
    console.log('Invalid Case Response:', invalidRes.status, invalidJson);

    if (!invalidJson.valid) {
      console.log('✅ Coupon correctly rejected for min purchase');
    } else {
      console.error('❌ Coupon should have been rejected');
    }

  } catch (error) {
    console.error('💥 Error during test:', error);
  }
}

testCouponFlow();
