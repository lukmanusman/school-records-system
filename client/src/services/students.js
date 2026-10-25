import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getStudents = async (academicSessionId, termId) => {
  const token = getToken()

  const params = new URLSearchParams()

  if (academicSessionId !== undefined && termId !== undefined) {
    params.set('academicSessionId', academicSessionId)
    params.set('termId', termId)
  }

  const queryString = params.toString()
  const url = queryString ? `${API_BASE_URL}/students?${queryString}` : `${API_BASE_URL}/students`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch students')
  }

  return data
}

export const getStudentById = async (studentId) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

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
