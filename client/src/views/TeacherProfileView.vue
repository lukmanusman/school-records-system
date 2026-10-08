<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import API_BASE_URL from '../services/api.js'
import { getToken } from '../services/authStorage.js'

const route = useRoute()

const teacher = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const loadTeacher = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = getToken()

    const response = await fetch(`${API_BASE_URL}/teachers/${route.params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch teacher')
    }

    teacher.value = data
  } catch (error) {
    console.error('Error loading teacher:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadTeacher()
})
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'teachers' }"> ← Back to Teachers </RouterLink>

    <h1>Teacher Profile</h1>

    <p v-if="isLoading">Loading teacher profile...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <div v-else-if="teacher">
      <p>
        <strong>First Name:</strong>
        {{ teacher.firstName }}
      </p>

      <p>
        <strong>Other Name:</strong>
        {{ teacher.otherName || '—' }}
      </p>

      <p>
        <strong>Surname:</strong>
        {{ teacher.surname }}
      </p>

      <p>
        <strong>Email:</strong>
        {{ teacher.email }}
      </p>

      <p>
        <strong>Teacher ID:</strong>
        {{ teacher.id }}
      </p>
    </div>
  </div>
</template>
