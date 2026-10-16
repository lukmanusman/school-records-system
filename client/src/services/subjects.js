const API_URL = 'http://localhost:5000/api/subjects'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export const getSubjects = async () => {
  const response = await fetch(API_URL, {
    headers: getAuthHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load subjects')
  }

  return data
}

export const createSubject = async (name) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create subject')
  }

  return data
}
