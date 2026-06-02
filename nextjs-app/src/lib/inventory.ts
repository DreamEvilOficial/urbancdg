import db from '@/lib/db';

export async function deductStockForOrder(orderId: string) {
    try {
        const items = await db.all('SELECT * FROM orden_items WHERE orden_id = ?', [orderId]);
        
        if (!items || items.length === 0) return;

        await db.transaction(async (client) => {
            for (const item of items as any[]) {
                const productId = item.producto_id;
                const cantidad = item.cantidad;
                let varianteInfo: any = {};
                
                if (item.variante_info) {
                    try {
                        varianteInfo = typeof item.variante_info === 'string' 
                            ? JSON.parse(item.variante_info) 
                            : item.variante_info;
                    } catch {
                        varianteInfo = {};
                    }
                }

                if (varianteInfo.talle && varianteInfo.color) {
                    // Update variant stock if applicable
                    await client.query(`
                        UPDATE variantes 
                        SET stock = stock - $1, updated_at = NOW() 
                        WHERE producto_id = $2 AND talle = $3 AND (color = $4 OR color_hex = $4)
                    `, [cantidad, productId, varianteInfo.talle, varianteInfo.color]);
                }

                // Update global product stock
                await client.query(`
                    UPDATE productos 
                    SET stock_actual = stock_actual - $1 
                    WHERE id = $2
                `, [cantidad, productId]);
            }
        });
        
        console.log(`[Inventory] Stock deducted successfully for order ${orderId}`);
    } catch (error) {
        console.error(`[Inventory] Error deducting stock for order ${orderId}:`, error);
        throw error;
    }
}
