import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

const getAuthHeaders = () => {
  const token = getToken()

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

const parseResponse = async (response, defaultMessage) => {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || defaultMessage)
  }

  return data
}

export const getResults = async (filters = {}) => {
  const token = getToken()
  const queryParams = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, value)
    }
  })

  const queryString = queryParams.toString()
  const url = `${API_BASE_URL}/results${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return parseResponse(response, 'Failed to fetch results')
}

export const createResult = async (resultData) => {
  const response = await fetch(`${API_BASE_URL}/results`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(resultData),
  })

  return parseResponse(response, 'Failed to create result')
}

export const updateResult = async (resultId, resultData) => {
  const response = await fetch(`${API_BASE_URL}/results/${resultId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(resultData),
  })

  return parseResponse(response, 'Failed to update result')
}

export const getResultById = async (resultId) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/results/${resultId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return parseResponse(response, 'Failed to fetch result')
}
