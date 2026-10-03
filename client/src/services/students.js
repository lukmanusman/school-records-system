import API_BASE_URL from './api.js'

export const getStudents = async () => {
  const response = await fetch(`${API_BASE_URL}/students`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch students')
  }

  return data
}
