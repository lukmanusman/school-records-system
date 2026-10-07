import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getTeachers = async () => {
  const response = await fetch(`${API_BASE_URL}/teachers`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch teachers')
  }

  return data
}

export const createTeacher = async (teacherData) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/teachers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(teacherData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create teacher')
  }

  return data.data
}

export const updateTeacher = async (teacherId, teacherData) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(teacherData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update teacher')
  }

  return data.data
}
