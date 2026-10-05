<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getStudents, updateStudent } from '../services/students.js'

const students = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedStudent = ref(null)
const isUpdating = ref(false)
const updateErrorMessage = ref('')

const editForm = reactive({
  firstName: '',
  surname: '',
  otherName: '',
  gender: '',
  dateOfBirth: '',
})

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

const handleEdit = (student) => {
  selectedStudent.value = student

  Object.assign(editForm, {
    firstName: student.firstName,
    surname: student.surname,
    otherName: student.otherName || '',
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
  })
}

const handleCancelEdit = () => {
  selectedStudent.value = null
}

const handleUpdate = async () => {
  updateErrorMessage.value = ''
  isUpdating.value = true

  try {
    const updatedStudent = await updateStudent(selectedStudent.value.id, editForm)

    const studentIndex = students.value.findIndex((student) => student.id === updatedStudent.id)

    if (studentIndex !== -1) {
      students.value[studentIndex] = {
        ...students.value[studentIndex],
        ...updatedStudent,
      }
    }

    selectedStudent.value = null
  } catch (error) {
    console.error('Error updating student:', error)
    updateErrorMessage.value = error.message
  } finally {
    isUpdating.value = false
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
            <th>Actions</th>
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

            <td>
              <button type="button" @click="handleEdit(student)">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="selectedStudent">
        <h2>Edit Student</h2>

        <form @submit.prevent="handleUpdate">
          <div>
            <label for="firstName">First Name</label>
            <input id="firstName" type="text" v-model="editForm.firstName" />
          </div>

          <div>
            <label for="surname">Surname</label>
            <input id="surname" type="text" v-model="editForm.surname" />
          </div>

          <div>
            <label for="otherName">Other Name</label>
            <input id="otherName" type="text" v-model="editForm.otherName" />
          </div>

          <div>
            <label for="gender">Gender</label>
            <select id="gender" v-model="editForm.gender">
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div>
            <label for="dateOfBirth">Date of Birth</label>
            <input id="dateOfBirth" type="date" v-model="editForm.dateOfBirth" />
          </div>

          <p v-if="updateErrorMessage">
            {{ updateErrorMessage }}
          </p>

          <button type="submit" :disabled="isUpdating">
            {{ isUpdating ? 'Saving...' : 'Save Changes' }}
          </button>
          <button type="button" @click="handleCancelEdit">Cancel</button>
        </form>
      </div>
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
