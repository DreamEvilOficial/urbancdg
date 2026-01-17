
import db from './src/lib/db.js';

async function test() {
    try {
        const rows = await db.all('SELECT estado, count(*) as count FROM ordenes GROUP BY estado');
        console.log(JSON.stringify(rows, null, 2));
        
        const sample = await db.all('SELECT items FROM ordenes WHERE items IS NOT NULL LIMIT 1');
        console.log('Sample items:', sample[0]?.items);
        console.log('Type of sample items:', typeof sample[0]?.items);
    } catch (e) {
        console.error(e);
    }
}

test();
