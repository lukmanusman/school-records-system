<script setup>
import { useAuth } from '../composables/useAuth.js'

const { user } = useAuth()
</script>

<template>
  <div>
    <h1>My Profile</h1>

    <div v-if="user">
      <p>
        <strong>Email:</strong>
        {{ user.email }}
      </p>

      <p>
        <strong>Role:</strong>
        {{ user.role }}
      </p>
    </div>

    <div>
      <RouterLink :to="{ name: 'change-password' }"> Change Password </RouterLink>
    </div>
  </div>
</template>
