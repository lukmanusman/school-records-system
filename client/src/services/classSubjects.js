const API_URL = 'http://localhost:5000/api/class-subjects'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export const getClassSubjects = async () => {
  const response = await fetch(API_URL, {
    headers: getAuthHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load class subjects')
  }

  return data
}

export const createClassSubject = async (classId, subjectId) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      classId: Number(classId),
      subjectId: Number(subjectId),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to assign subject to class')
  }

  return data
}
