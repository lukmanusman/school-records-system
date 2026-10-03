<script setup>
import { useAuth } from '../composables/useAuth.js'

const { user } = useAuth()
</script>

<template>
  <main>
    <h1>Dashboard</h1>

    <div v-if="user">
      <p>Welcome, {{ user.email }}</p>
      <p>Role: {{ user.role }}</p>
    </div>
  </main>
</template>
