<script setup>
import { onMounted, ref } from 'vue'
import { getClasses, createClass } from '../services/classes.js'

const classes = ref([])
const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const className = ref('')

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

const handleCreateClass = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  isCreating.value = true

  try {
    await createClass(className.value)

    successMessage.value = 'Class created successfully.'
    className.value = ''

    await loadClasses()
  } catch (error) {
    console.error('Error creating class:', error)
    errorMessage.value = error.message
  } finally {
    isCreating.value = false
  }
}

onMounted(() => {
  loadClasses()
})
</script>

<template>
  <div>
    <h1>Classes</h1>

    <section>
      <h2>Create Class</h2>

      <form @submit.prevent="handleCreateClass">
        <label for="className">Class Name</label>

        <input
          id="className"
          v-model="className"
          type="text"
          placeholder="e.g. JSS1A"
          pattern="(JSS[1-3]|SS[1-3])[A-Za-z]"
          title="Use a class name such as JSS1A or SS2B"
          required
        />

        <button type="submit" :disabled="isCreating">
          {{ isCreating ? 'Creating...' : 'Create Class' }}
        </button>
      </form>

      <p v-if="successMessage">{{ successMessage }}</p>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <section>
      <h2>Class List</h2>

      <p v-if="isLoading">Loading classes...</p>

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
