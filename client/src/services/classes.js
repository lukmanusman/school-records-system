import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getClasses = async () => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/classes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch classes')
  }

  return data
}

export const createClass = async (name) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create class')
  }

  return data.class
}
