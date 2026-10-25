<script setup>
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth.js'

const { user } = useAuth()

const isStudent = computed(() => user.value?.role === 'STUDENT')
const canManageResults = computed(() => ['ADMIN', 'TEACHER'].includes(user.value?.role))
</script>

<template>
  <aside>
    <h2>School Records</h2>

    <nav>
      <RouterLink :to="{ name: 'dashboard' }"> Dashboard </RouterLink>

      <RouterLink to="/students"> Students </RouterLink>

      <RouterLink to="/teachers"> Teachers </RouterLink>

      <RouterLink to="/classes"> Classes </RouterLink>

      <RouterLink to="/subjects"> Subjects </RouterLink>

      <div>
        <RouterLink :to="isStudent ? '/results/student' : '/results/entry'"> Result </RouterLink>

        <div v-if="canManageResults">
          <RouterLink to="/results/entry"> Entry </RouterLink>
          <RouterLink to="/results/preview"> Preview </RouterLink>
        </div>
      </div>

      <RouterLink to="/promotions"> Promotions </RouterLink>

      <RouterLink to="/academic-sessions"> Academic Sessions </RouterLink>
    </nav>
  </aside>
</template>
