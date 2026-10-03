<script setup>
import { onMounted, ref } from 'vue'
import { getStudents } from '../services/students.js'

const students = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const loadStudents = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    students.value = await getStudents()
  } catch (error) {
    console.error('Error loading students:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadStudents()
})
</script>

<template>
  <div>
    <h1>Students</h1>

    <p v-if="isLoading">Loading students...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <p v-else-if="students.length === 0">No students found.</p>

    <div v-else>
      <p>Total students: {{ students.length }}</p>

      <table>
        <thead>
          <tr>
            <th>Admission Number</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Date of Birth</th>
            <th>Class</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="student in students" :key="student.id">
            <td>{{ student.admissionNumber }}</td>

            <td>
              {{ student.firstName }}
              {{ student.otherName ? student.otherName + ' ' : '' }}
              {{ student.surname }}
            </td>

            <td>{{ student.gender }}</td>

            <td>{{ student.dateOfBirth }}</td>

            <td>{{ student.class?.name || 'Not assigned' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
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
