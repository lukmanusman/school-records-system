<script setup>
import { onMounted, ref } from 'vue'
import { getClasses } from '../services/classes.js'

const classes = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const loadClasses = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    classes.value = await getClasses()
  } catch (error) {
    console.error('Error loading classes:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadClasses()
})
</script>

<template>
  <div>
    <h1>Classes</h1>

    <p v-if="isLoading">Loading classes...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <p v-else-if="classes.length === 0">No classes found.</p>

    <div v-else>
      <p>Total classes: {{ classes.length }}</p>

      <table>
        <thead>
          <tr>
            <th>Class ID</th>
            <th>Class Name</th>
            <th>Number of Students</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="schoolClass in classes" :key="schoolClass.id">
            <td>{{ schoolClass.id }}</td>
            <td>{{ schoolClass.name }}</td>
            <td>{{ schoolClass._count.students }}</td>
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
