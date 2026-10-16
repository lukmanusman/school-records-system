import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getTeacherAssignments = async () => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/teacher-assignments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load teacher assignments')
  }

  return data
}

export const createTeacherAssignment = async (teacherId, subjectId, classId) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/teacher-assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      teacherId: Number(teacherId),
      subjectId: Number(subjectId),
      classId: Number(classId),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to assign teacher')
  }

  return data
}
