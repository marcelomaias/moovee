'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFavorites, toggleFavorite } from '@/lib/favorites'

export function useFavorites() {
  // Initialize as empty to avoid SSR/hydration mismatch
  const [favorites, setFavorites] = useState<number[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setFavorites(getFavorites())
    setHydrated(true)
  }, [])

  const toggle = useCallback((id: number) => {
    const updated = toggleFavorite(id)
    setFavorites(updated)
  }, [])

  const isFav = useCallback(
    (id: number) => (hydrated ? favorites.includes(id) : false),
    [favorites, hydrated]
  )

  return { favorites, toggle, isFav, hydrated }
}
