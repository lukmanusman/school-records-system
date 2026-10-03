<script setup>
import { useAuth } from '../../composables/useAuth.js'
import { useRouter } from 'vue-router'

const { user, logout } = useAuth()
const router = useRouter()

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header>
    <div v-if="user">
      <p>{{ user.email }}</p>
      <p>{{ user.role }}</p>
    </div>
    <button type="button" @click="handleLogout">Logout</button>
  </header>
</template>
