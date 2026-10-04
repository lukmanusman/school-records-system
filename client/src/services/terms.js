import API_BASE_URL from './api.js'

export const getTerms = async (academicSessionId) => {
  const response = await fetch(`${API_BASE_URL}/terms?academicSessionId=${academicSessionId}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch terms')
  }

  return data
}
