
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde el archivo .env.local de nextjs-app
dotenv.config({ path: path.join(__dirname, 'nextjs-app', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno para conectar con Supabase.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTable() {
    console.log('🔍 Inspeccionando tabla "productos"...');
    
    // Intentamos obtener una fila para ver las columnas
    const { data, error } = await supabase.from('productos').select('*').limit(1);
    
    if (error) {
        console.error('❌ Error al consultar la tabla:', error.message);
        return;
    }

    if (data.length === 0) {
        console.log('⚠️ La tabla está vacía. Intentando obtener nombres de columnas vía RPC o error forzado...');
        // Si está vacía, intentamos insertar un objeto vacío para que el error nos diga qué columnas hay
        const { error: insertError } = await supabase.from('productos').insert({ id: '00000000-0000-0000-0000-000000000000' });
        if (insertError) {
            console.log('📝 Info del esquema obtenida vía error:', insertError.message);
        }
    } else {
        console.log('✅ Columnas detectadas en "productos":');
        console.log(Object.keys(data[0]).join(', '));
        console.log('\n📊 Ejemplo de datos:', JSON.stringify(data[0], null, 2));
    }
}

inspectTable();
