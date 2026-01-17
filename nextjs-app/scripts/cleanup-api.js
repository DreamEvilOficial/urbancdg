async function main() {
  const baseUrl = 'http://localhost:3000';
  console.log(`Cleaning pending orders via API at ${baseUrl}...`);

  try {
    // 1. Get all orders
    const res = await fetch(`${baseUrl}/api/orders`);
    if (!res.ok) throw new Error(`Failed to fetch orders: ${res.statusText}`);
    const orders = await res.json();

    if (!Array.isArray(orders)) {
        console.error('API did not return an array of orders:', orders);
        return;
    }

    // 2. Filter pending
    const pending = orders.filter(o => o.estado === 'pendiente');
    console.log(`Found ${pending.length} pending orders.`);

    // 3. Delete each
    for (const order of pending) {
      console.log(`Deleting order ${order.numero_orden} (${order.id})...`);
      const delRes = await fetch(`${baseUrl}/api/orders?id=${order.id}`, {
        method: 'DELETE'
      });
      if (!delRes.ok) console.error(`Failed to delete ${order.id}: ${delRes.statusText}`);
      else console.log(`Deleted ${order.id}`);
    }
    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
