import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Each item: { id, type: 'template'|'agent', slug, name, price, meta? }
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (item) => {
        const already = get().items.some((i) => i.id === item.id)
        if (already) {
          set({ isOpen: true })
          return
        }
        set((s) => ({ items: [...s.items, item], isOpen: true }))
      },

      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      hasItem: (id) => get().items.some((i) => i.id === id),

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + (i.price || 0), 0),
    }),
    {
      name: 'sakmart-cart',
      partialize: (s) => ({ items: s.items }),  // don't persist isOpen
    }
  )
)
