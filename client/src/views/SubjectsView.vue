<script setup>
import { onMounted, ref } from 'vue'
import { getSubjects, createSubject } from '../services/subjects.js'

const subjects = ref([])
const subjectName = ref('')
const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const loadSubjects = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    subjects.value = await getSubjects()
  } catch (error) {
    console.error('Error loading subjects:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const handleCreateSubject = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isCreating.value = true

  try {
    const response = await createSubject(subjectName.value)

    successMessage.value = response.message || 'Subject created successfully.'
    subjectName.value = ''

    await loadSubjects()
  } catch (error) {
    console.error('Error creating subject:', error)
    errorMessage.value = error.message
  } finally {
    isCreating.value = false
  }
}

onMounted(loadSubjects)
</script>

<template>
  <div>
    <h1>Subjects</h1>

    <section>
      <h2>Create Subject</h2>

      <form @submit.prevent="handleCreateSubject">
        <label for="subjectName">Subject Name</label>

        <input
          id="subjectName"
          v-model="subjectName"
          type="text"
          placeholder="e.g. Mathematics"
          required
        />

        <button type="submit" :disabled="isCreating">
          {{ isCreating ? 'Creating...' : 'Create Subject' }}
        </button>
      </form>

      <p v-if="successMessage">{{ successMessage }}</p>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <section>
      <h2>Subject List</h2>

      <p v-if="isLoading">Loading subjects...</p>

      <p v-else-if="subjects.length === 0">No subjects found.</p>

      <div v-else>
        <p>Total subjects: {{ subjects.length }}</p>

        <table>
          <thead>
            <tr>
              <th>Subject ID</th>
              <th>Subject Name</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="subject in subjects" :key="subject.id">
              <td>{{ subject.id }}</td>
              <td>{{ subject.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
section {
  margin-bottom: 2rem;
}

form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

input {
  padding: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th,
td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  font-weight: 600;
}
</style>
