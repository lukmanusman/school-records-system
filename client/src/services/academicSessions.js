import API_BASE_URL from './api.js'

export const getAcademicSessions = async () => {
  const response = await fetch(`${API_BASE_URL}/academic-sessions`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch academic sessions')
  }

  return data
}
