import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  nombre: string
  precio: number
  cantidad: number
  imagen_url?: string
  talle?: string
  color?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, cantidad: number) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => {
        const existingItem = state.items.find(i => i.id === item.id)
        
        if (existingItem) {
          return {
            items: state.items.map(i =>
              i.id === item.id
                ? { ...i, cantidad: i.cantidad + item.cantidad }
                : i
            )
          }
        }
        
        return { items: [...state.items, item] }
      }),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      
      updateQuantity: (id, cantidad) => set((state) => {
        if (cantidad <= 0) {
          return { items: state.items.filter(i => i.id !== id) }
        }
        
        return {
          items: state.items.map(i =>
            i.id === id ? { ...i, cantidad } : i
          )
        }
      }),
      
      clearCart: () => set({ items: [] }),
      
      total: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
      }
    }),
    {
      name: 'cart-storage',
    }
  )
)
