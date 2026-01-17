
import db from './src/lib/db.js';

async function test() {
    try {
        const rows = await db.all('SELECT numero_orden FROM ordenes LIMIT 10');
        console.log('Sample numero_orden values:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
