const STORAGE_KEY = 'movie_favorites'

export function getFavorites(): number[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function toggleFavorite(id: number): number[] {
  const current = getFavorites()
  const updated = current.includes(id)
    ? current.filter((f) => f !== id)
    : [...current, id]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function isFavorite(id: number): boolean {
  return getFavorites().includes(id)
}
