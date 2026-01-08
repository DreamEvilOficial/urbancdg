
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Solo verificar variables críticas en el servidor para evitar ruido en la consola del navegador
if (typeof window === 'undefined') {
  if (!url) {
    console.error('❌ ERROR CRÍTICO: NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) no está definida en el servidor')
  }

  if (!serviceKey) {
    console.warn('⚠️ ADVERTENCIA: SUPABASE_SERVICE_ROLE_KEY no está definida. Admin/Service Role deshabilitado.')
  } else {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY detectada. Modo Admin habilitado.')
  }
}

export const supabase = (url && key) ? createSupabaseClient(url, key) : (undefined as any)

// Cliente con permisos de admin (Service Role) para usar SOLO en el servidor
export const supabaseAdmin = (url && serviceKey) 
  ? createSupabaseClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) 
  : undefined

export interface Producto {
  id: string
  nombre: string
  slug?: string
  descripcion: string
  precio: number
  precio_original?: number
  descuento_porcentaje?: number
  stock_actual: number
  stock_minimo?: number
  categoria_id?: string
  subcategoria_id?: string
  imagen_url?: string
  imagenes?: string[]
  variantes?: {talle: string, color: string, color_nombre?: string, stock: number, imagen_url?: string}[]
  activo: boolean
  destacado: boolean
  top: boolean
  sku?: string
  peso?: number
  dimensiones?: any
  proveedor_nombre?: string
  proveedor_contacto?: string
  precio_costo?: number
  metadata?: any
  created_at: string
  updated_at?: string
}

export interface Categoria {
  id: string
  nombre: string
  slug: string
  imagen_url?: string
  activo: boolean
  orden: number
  subcategorias?: Subcategoria[]
}

export interface Subcategoria {
  id: string
  categoria_id: string
  nombre: string
  slug: string
  activo: boolean
  orden: number
}

export interface Etiqueta {
  id: string
  nombre: string
  tipo: string
  color: string
  icono: string
}

export interface Orden {
  id: string
  numero_orden: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono?: string
  direccion_envio?: string
  envio?: number
  subtotal?: number
  total: number
  estado: string
  mercadopago_payment_id?: number
  notas?: string
  created_at: string
}

// Helper para fetch
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // Aseguramos que la URL sea relativa o completa
  const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;
  
  console.log(`[apiFetch] Requesting: ${url}`, options);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!res.ok) {
     const errorText = await res.text();
     console.error(`[apiFetch] Error ${res.status}:`, errorText);
     try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || error.message || 'Error en la petición');
     } catch (e) {
        throw new Error(`Error ${res.status}: ${errorText}`);
     }
  }
  
  return res.json();
}

export const productosAPI = {
  async obtenerTodos() {
    return apiFetch('/products?active=true') as Promise<Producto[]>;
  },
  
  async obtenerPorSlug(slug: string) {
    const list = await apiFetch(`/products?slug=${encodeURIComponent(slug)}&active=true&limit=1`) as Producto[];
    return Array.isArray(list) ? (list[0] as Producto | undefined) : undefined;
  },
  
  async obtenerTodosAdmin() {
    return apiFetch('/products?admin=true') as Promise<Producto[]>;
  },

  async obtenerDestacados() {
    return apiFetch('/products?destacado=true&limit=8') as Promise<Producto[]>;
  },

  async obtenerTOP() {
    return apiFetch('/products?top=true&limit=6') as Promise<Producto[]>;
  },

  async obtenerPorId(id: string) {
    return apiFetch(`/products/${id}`) as Promise<Producto>;
  },

  async crear(producto: Partial<Producto>) {
    return apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(producto)
    }) as Promise<Producto>;
  },

  async actualizar(id: string, producto: Partial<Producto>) {
    return apiFetch(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(producto)
    }) as Promise<Producto>;
  },

  async eliminar(id: string) {
    return apiFetch(`/products/${id}`, {
        method: 'DELETE'
    });
  },

  async obtenerPorCategoria(slug: string) {
    return apiFetch(`/products?category_slug=${slug}`) as Promise<Producto[]>;
  }
}

export const ordenesAPI = {
  async crear(orden: Partial<Orden>) {
     // Implementar ordenes API route
     return apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orden)
     }) as Promise<Orden>;
  },

  async obtenerPorEmail(email: string) {
     return apiFetch(`/orders?email=${email}`) as Promise<Orden[]>;
  }
}

export const authAPI = {
  async signUp(email: string, password: string) {
    // throw new Error("Registro deshabilitado por el momento");
     return apiFetch('/auth/signup', {
         method: 'POST',
         body: JSON.stringify({ email, password })
     });
  },

  async signIn(email: string, password: string) {
     const { user } = await apiFetch('/auth/login', {
         method: 'POST',
         body: JSON.stringify({ email, password })
     });
     return { user, session: { user } }; // Adapt to match expected supabase return shape roughly
  },

  async signOut() {
    await apiFetch('/auth/logout', { method: 'POST' });
  },

  async getUser() {
    const { user } = await apiFetch('/auth/me');
    return user ? { user } : { user: null };
  }
}

export const categoriasAPI = {
  async obtenerTodas() {
    return apiFetch('/categories') as Promise<Categoria[]>;
  },

  async crear(categoria: Partial<Categoria>) {
    return apiFetch('/categories', { method: 'POST', body: JSON.stringify(categoria) });
  },

  async crearSubcategoria(subcategoria: Partial<Subcategoria>) {
    return apiFetch('/categories/sub', { method: 'POST', body: JSON.stringify(subcategoria) });
  },
  
  async eliminar(id: string) {
     return apiFetch(`/categories/${id}`, { method: 'DELETE' });
  },

  async eliminarSubcategoria(id: string) {
     return apiFetch(`/categories/sub/${id}`, { method: 'DELETE' });
  }
}

export const etiquetasAPI = {
  async obtenerTodas() {
    return apiFetch('/tags') as Promise<Etiqueta[]>;
  },

  async asignarProducto(productoId: string, etiquetaId: string) {
     // TODO
  },

  async desasignarProducto(productoId: string, etiquetaId: string) {
     // TODO
  },

  async obtenerPorProducto(productoId: string) {
    return [] as string[]; // TODO
  }
}

export const deudasAPI = {
  async obtenerTodas() {
    return apiFetch('/debts');
  },
  
  async crear(cliente: any) {
    return apiFetch('/debts', {
      method: 'POST',
      body: JSON.stringify(cliente)
    });
  },
  
  async agregarMovimiento(data: { id: string, monto: number, descripcion: string, tipo: 'deuda' | 'pago' }) {
    return apiFetch('/debts', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  async eliminar(id: string) {
    return apiFetch(`/debts?id=${id}`, {
      method: 'DELETE'
    });
  }
}

