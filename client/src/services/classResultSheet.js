import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getClassResultSheet = async (filters = {}) => {
  const token = getToken()
  const queryParams = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, value)
    }
  })

  const queryString = queryParams.toString()

  const response = await fetch(`${API_BASE_URL}/class-result-sheets?${queryString}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch class result sheet')
  }

  return data
}
