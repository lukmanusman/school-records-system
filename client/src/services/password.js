import API_BASE_URL from './api.js'
import { getToken } from './authStorage.js'

export const changePassword = async (currentPassword, newPassword) => {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to change password')
  }

  return data
}
