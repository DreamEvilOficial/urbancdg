
async function handleSaveProductLogic(data, mockCats) {
    // Mock APIs
    const categoriasAPI = {
        obtenerTodas: async () => {
            if (mockCats === null) throw new Error("API Error");
            return mockCats;
        }
    };

    // Logic from handleSaveProduct
    // Resolver categoría y subcategoría a IDs/SLUGs fiables
    let categoria_id = data.categoria_id || null
    let subcategoria_id = data.subcategoria_id || null

    try {
        const cats = await categoriasAPI.obtenerTodas();

        if (cats && (data.categoria || data.categoria_slug || data.categoria_id)) {
            const targetCat = cats.find((c) => 
                (data.categoria_slug && c.slug === data.categoria_slug) ||
                (data.categoria && (c.slug === data.categoria || c.nombre === data.categoria)) ||
                (data.categoria_id && String(c.id) === String(data.categoria_id))
            )
            if (targetCat) {
                categoria_id = targetCat.id
                if (Array.isArray(targetCat.subcategorias) && (data.subcategoria || data.subcategoria_slug || data.subcategoria_id)) {
                    const targetSub = targetCat.subcategorias.find((s) => 
                        (data.subcategoria_slug && s.slug === data.subcategoria_slug) ||
                        (data.subcategoria && (s.slug === data.subcategoria || s.nombre === data.subcategoria)) ||
                        (data.subcategoria_id && String(s.id) === String(data.subcategoria_id))
                    )
                    if (targetSub) {
                        subcategoria_id = targetSub.id
                    }
                }
            }
        }
    } catch (e) {
        console.warn('No se pudo resolver categoría/subcategoría:', e.message)
    }

    const normalizadoCategoriaId =
        !categoria_id || categoria_id === 'Seleccionar...' ? null : categoria_id
    const normalizadoSubcategoriaId =
        !subcategoria_id || subcategoria_id === 'Ninguna' ? null : subcategoria_id

    return { normalizadoCategoriaId, normalizadoSubcategoriaId };
}

// Test cases
async function runTests() {
    const mockCats = [
        { id: 'cat1', nombre: 'Category 1', slug: 'category-1', subcategorias: [{ id: 'sub1', nombre: 'Sub 1', slug: 'sub-1' }] }
    ];

    console.log("Running tests...");

    // Case 1: Valid ID matches category
    let res = await handleSaveProductLogic({ categoria_id: 'cat1' }, mockCats);
    console.log('Case 1 (Valid ID):', res.normalizadoCategoriaId === 'cat1' ? 'PASS' : 'FAIL', res.normalizadoCategoriaId);

    // Case 2: ID not in list (should preserve ID)
    res = await handleSaveProductLogic({ categoria_id: 'cat999' }, mockCats);
    console.log('Case 2 (ID not found):', res.normalizadoCategoriaId === 'cat999' ? 'PASS' : 'FAIL', res.normalizadoCategoriaId);

    // Case 3: Empty string (should be null)
    res = await handleSaveProductLogic({ categoria_id: '' }, mockCats);
    console.log('Case 3 (Empty):', res.normalizadoCategoriaId === null ? 'PASS' : 'FAIL', res.normalizadoCategoriaId);

    // Case 4: "Seleccionar..." (should be null)
    res = await handleSaveProductLogic({ categoria_id: 'Seleccionar...' }, mockCats);
    console.log('Case 4 (Seleccionar...):', res.normalizadoCategoriaId === null ? 'PASS' : 'FAIL', res.normalizadoCategoriaId);

    // Case 5: Empty categories list (should preserve ID)
    res = await handleSaveProductLogic({ categoria_id: 'cat1' }, []);
    console.log('Case 5 (Empty Cats):', res.normalizadoCategoriaId === 'cat1' ? 'PASS' : 'FAIL', res.normalizadoCategoriaId);

    // Case 6: API failure (should preserve ID)
    res = await handleSaveProductLogic({ categoria_id: 'cat1' }, null);
    console.log('Case 6 (API Error):', res.normalizadoCategoriaId === 'cat1' ? 'PASS' : 'FAIL', res.normalizadoCategoriaId);
}

runTests();
