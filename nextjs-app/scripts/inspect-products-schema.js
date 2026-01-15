require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL length:', process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.length : 'undefined');
console.log('DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 'undefined');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('🔍 Inspeccionando esquema de base de datos...');
  console.log(`📡 URL: ${supabaseUrl}`);

  try {
    // 1. Verificar tabla 'productos'
    console.log('\n--- Tabla: productos ---');
    const { data: products, error: prodError } = await supabase
      .from('productos')
      .select('*')
      .limit(1);

    if (prodError) {
      console.error('❌ Error accediendo a tabla productos:', prodError.message);
    } else {
      console.log('✅ Acceso exitoso.');
      if (products.length > 0) {
        console.log('🔑 Columnas detectadas (basado en primer registro):', Object.keys(products[0]).join(', '));
      } else {
        console.log('⚠️ La tabla está vacía, no se pueden detectar columnas dinámicamente.');
      }
    }

    // 2. Verificar tabla 'variantes'
    console.log('\n--- Tabla: variantes ---');
    const { data: variants, error: varError } = await supabase
      .from('variantes')
      .select('*')
      .limit(1);

    if (varError) {
      console.error('❌ Error accediendo a tabla variantes:', varError.message);
      if (varError.code === '42P01') {
        console.error('   -> La tabla no existe.');
      }
    } else {
      console.log('✅ Acceso exitoso.');
      if (variants.length > 0) {
        console.log('🔑 Columnas detectadas:', Object.keys(variants[0]).join(', '));
      } else {
        console.log('⚠️ La tabla está vacía.');
      }
    }

    // 3. Verificar tabla 'ordenes' (para ventas)
    console.log('\n--- Tabla: ordenes ---');
    const { data: orders, error: orderError } = await supabase
      .from('ordenes')
      .select('*')
      .limit(1);

    if (orderError) {
        console.error('❌ Error accediendo a tabla ordenes:', orderError.message);
    } else {
        console.log('✅ Acceso exitoso.');
        if (orders.length > 0) {
            console.log('🔑 Columnas detectadas:', Object.keys(orders[0]).join(', '));
        }
    }

  } catch (err) {
    console.error('💥 Error inesperado:', err);
  }
}

inspectSchema();
