import { ref } from 'vue'
import { getToken, getUser, saveAuth, clearAuth } from '../services/authStorage.js'

const token = ref(getToken())
const user = ref(getUser())

export const useAuth = () => {
  const isAuthenticated = () => {
    return !!token.value
  }

  const setAuth = (authData) => {
    saveAuth(authData)

    token.value = authData.token
    user.value = authData.user
  }

  const logout = () => {
    clearAuth()

    token.value = null
    user.value = null
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    logout,
  }
}
