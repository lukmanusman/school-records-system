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

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch class result sheet')
  }

  return data
}

export const submitClassResultSheet = async (sheetData) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/class-result-sheets/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sheetData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to submit class result sheet')
  }

  return data
}

export const approveClassResultSheet = async (sheetId) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/class-result-sheets/${sheetId}/approve`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to approve class result sheet')
  }

  return data
}

export const returnClassResultSheet = async (sheetId, reason) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/class-result-sheets/${sheetId}/return`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to return class result sheet')
  }

  return data
}
