<script setup>
import { useAuth } from '../../composables/useAuth.js'
import { useRouter } from 'vue-router'
import ProfileAvatar from './ProfileAvatar.vue'

const { user, logout } = useAuth()
const router = useRouter()

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div v-if="user" class="user-info">
      <ProfileAvatar :image-url="user.profileImageUrl" :name="user.email" :size="40" />

      <div class="user-details">
        <p>{{ user.email }}</p>
        <p>{{ user.role }}</p>

        <RouterLink :to="{ name: 'profile' }"> My Profile </RouterLink>
      </div>
    </div>

    <button type="button" @click="handleLogout">Logout</button>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-details p {
  margin: 0 0 0.25rem;
}
</style>
