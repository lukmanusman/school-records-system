import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getStudents = async () => {
  const response = await fetch(`${API_BASE_URL}/students`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch students')
  }

  return data
}

export const getStudentById = async (studentId) => {
  const response = await fetch(`${API_BASE_URL}/students/${studentId}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch student')
  }

  return data
}

export const updateStudent = async (studentId, studentData) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(studentData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update student')
  }

  return data.data
}
