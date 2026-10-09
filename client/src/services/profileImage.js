import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const getMyProfile = async () => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/profile-image/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to retrieve profile')
  }

  return data.data
}

export const uploadProfileImage = async (imageFile) => {
  const token = getToken()
  const formData = new FormData()

  formData.append('profileImage', imageFile)

  const response = await fetch(`${API_BASE_URL}/profile-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to upload profile image')
  }

  return data.data
}
