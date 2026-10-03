<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { user, logout } = useAuth()

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <main>
    <h1>Dashboard</h1>

    <div v-if="user">
      <p>Welcome, {{ user.email }}</p>
      <p>Role: {{ user.role }}</p>
    </div>

    <button type="button" @click="handleLogout">Logout</button>
  </main>
</template>
