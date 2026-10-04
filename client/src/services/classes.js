import API_BASE_URL from './api.js'

export const getClasses = async () => {
  const response = await fetch(`${API_BASE_URL}/classes`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch classes')
  }

  return data
}
