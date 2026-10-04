import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const enrollStudent = async (studentData) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/enrollments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(studentData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to enroll student')
  }

  return data.data
}
