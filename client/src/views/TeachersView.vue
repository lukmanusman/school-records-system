<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getTeachers, createTeacher } from '../services/teachers.js'

const router = useRouter()
const teachers = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const showAddForm = ref(false)
const isCreating = ref(false)
const createErrorMessage = ref('')

const form = reactive({
  firstName: '',
  surname: '',
  otherName: '',
  email: '',
  password: '',
})

const loadTeachers = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    teachers.value = await getTeachers()
  } catch (error) {
    console.error('Error loading teachers:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const handleShowAddForm = () => {
  showAddForm.value = true
}

const handleCancelAdd = () => {
  showAddForm.value = false

  Object.assign(form, {
    firstName: '',
    surname: '',
    otherName: '',
    email: '',
    password: '',
  })
}

const handleCreateTeacher = async () => {
  isCreating.value = true
  createErrorMessage.value = ''

  try {
    await createTeacher(form)

    await loadTeachers()

    handleCancelAdd()
  } catch (error) {
    console.error('Error creating teacher:', error)
    createErrorMessage.value = error.message
  } finally {
    isCreating.value = false
  }
}

const handleViewTeacher = (teacher) => {
  router.push({
    name: 'teacher-profile',
    params: {
      id: teacher.id,
    },
  })
}

onMounted(() => {
  loadTeachers()
})
</script>

<template>
  <div>
    <h1>Teachers</h1>

    <button v-if="!showAddForm" type="button" @click="handleShowAddForm">Add Teacher</button>

    <div v-if="showAddForm">
      <h2>Add Teacher</h2>

      <form @submit.prevent="handleCreateTeacher">
        <div>
          <label for="firstName">First Name</label>
          <input id="firstName" v-model="form.firstName" type="text" />
        </div>

        <div>
          <label for="surname">Surname</label>
          <input id="surname" v-model="form.surname" type="text" />
        </div>

        <div>
          <label for="otherName">Other Name</label>
          <input id="otherName" v-model="form.otherName" type="text" />
        </div>

        <div>
          <label for="email">Email</label>
          <input id="email" v-model="form.email" type="email" />
        </div>

        <div>
          <label for="password">Password</label>
          <input id="password" v-model="form.password" type="password" />
        </div>

        <p v-if="createErrorMessage">
          {{ createErrorMessage }}
        </p>

        <button type="submit" :disabled="isCreating">
          {{ isCreating ? 'Creating...' : 'Create Teacher' }}
        </button>

        <button type="button" @click="handleCancelAdd">Cancel</button>
      </form>
    </div>

    <hr v-if="showAddForm" />

    <p v-if="isLoading">Loading teachers...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <p v-else-if="teachers.length === 0">No teachers found.</p>

    <div v-else>
      <p>Total teachers: {{ teachers.length }}</p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="teacher in teachers" :key="teacher.id">
            <td>
              {{ teacher.firstName }}
              {{ teacher.otherName ? teacher.otherName + ' ' : '' }}
              {{ teacher.surname }}
            </td>

            <td>{{ teacher.email }}</td>

            <td>
              <button type="button" @click="handleViewTeacher(teacher)">View Profile</button>
            </td>
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

form {
  max-width: 500px;
  margin-top: 1rem;
}

form > div {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.25rem;
}

input {
  width: 100%;
  padding: 0.5rem;
}

button {
  margin-right: 0.5rem;
  margin-top: 0.5rem;
}
</style>
