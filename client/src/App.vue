<script setup>
import { ref } from 'vue'
import { login } from './services/auth.js'
import { useAuth } from './composables/useAuth.js'

const { user, isAuthenticated, setAuth, logout } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const data = await login(email.value, password.value)

    setAuth(data)

    console.log('Login successful:', data)
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main>
    <div v-if="!isAuthenticated()">
      <h1>School Records System</h1>

      <form @submit.prevent="handleLogin">
        <div>
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required />
        </div>

        <div>
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>

        <p v-if="errorMessage">
          {{ errorMessage }}
        </p>
      </form>
    </div>

    <div v-else>
      <h1>Welcome</h1>

      <p>{{ user.email }}</p>
      <p>Role: {{ user.role }}</p>

      <button type="button" @click="logout">Logout</button>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 400px;
  margin: 4rem auto;
}

form {
  display: grid;
  gap: 1rem;
}

input {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
}

button {
  width: fit-content;
}
</style>
