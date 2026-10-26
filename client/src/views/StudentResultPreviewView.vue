<script setup>
import { onMounted, ref } from 'vue'
import { getResults } from '../services/results.js'

const results = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const loadResults = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // The backend identifies the logged-in student.
    // Do not send a studentId from the frontend.
    results.value = await getResults()
  } catch (error) {
    console.error('Error loading student results:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

onMounted(loadResults)
</script>

<template>
  <section>
    <h1>My Results</h1>

    <p v-if="isLoading">Loading your results...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <p v-else-if="results.length === 0">No published results are available yet.</p>

    <table v-else>
      <thead>
        <tr>
          <th>Academic Session</th>
          <th>Term</th>
          <th>Class</th>
          <th>Subject</th>
          <th>CA</th>
          <th>Exam</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="result in results" :key="result.id">
          <td>{{ result.academicSession.name }}</td>
          <td>{{ result.term.name }}</td>
          <td>{{ result.class?.name ?? '—' }}</td>
          <td>{{ result.subject.name }}</td>
          <td>
            {{ result.caStatus === 'ABSENT' ? 'ABS' : result.caScore }}
          </td>
          <td>
            {{ result.examStatus === 'ABSENT' ? 'ABS' : result.examScore }}
          </td>
          <td>{{ result.totalScore }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
