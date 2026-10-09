<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { getStudentById, updateStudent } from '../services/students.js'

const route = useRoute()
const { user } = useAuth()

const student = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const isEditing = ref(false)
const isUpdating = ref(false)
const updateErrorMessage = ref('')
const successMessage = ref('')

const editForm = reactive({
  firstName: '',
  surname: '',
  otherName: '',
  gender: '',
  dateOfBirth: '',
})

const canEdit = computed(() => user.value?.role === 'ADMIN')

const loadStudent = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    student.value = await getStudentById(route.params.id)
  } catch (error) {
    console.error('Error loading student profile:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const handleEdit = () => {
  if (!student.value) return

  Object.assign(editForm, {
    firstName: student.value.firstName,
    surname: student.value.surname,
    otherName: student.value.otherName || '',
    gender: student.value.gender,
    dateOfBirth: student.value.dateOfBirth ? String(student.value.dateOfBirth).slice(0, 10) : '',
  })

  updateErrorMessage.value = ''
  successMessage.value = ''
  isEditing.value = true
}

const handleCancelEdit = () => {
  isEditing.value = false
  updateErrorMessage.value = ''
}

const handleUpdate = async () => {
  updateErrorMessage.value = ''
  successMessage.value = ''
  isUpdating.value = true

  try {
    await updateStudent(student.value.id, { ...editForm })
    await loadStudent()

    isEditing.value = false
    successMessage.value = 'Student profile updated successfully.'
  } catch (error) {
    console.error('Error updating student:', error)
    updateErrorMessage.value = error.message
  } finally {
    isUpdating.value = false
  }
}

onMounted(() => {
  loadStudent()
})
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'students' }"> ← Back to Students </RouterLink>

    <h1>Student Profile</h1>

    <p v-if="isLoading">Loading student profile...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <div v-else-if="student">
      <div>
        <h2>
          {{ student.firstName }}
          {{ student.otherName ? student.otherName + ' ' : '' }}
          {{ student.surname }}
        </h2>

        <button v-if="canEdit && !isEditing" type="button" @click="handleEdit">Edit Profile</button>
      </div>

      <p v-if="successMessage">{{ successMessage }}</p>

      <section v-if="isEditing">
        <h2>Edit Student Profile</h2>

        <form @submit.prevent="handleUpdate">
          <div>
            <label for="firstName">First Name</label>
            <input id="firstName" v-model.trim="editForm.firstName" type="text" required />
          </div>

          <div>
            <label for="surname">Surname</label>
            <input id="surname" v-model.trim="editForm.surname" type="text" required />
          </div>

          <div>
            <label for="otherName">Other Name</label>
            <input id="otherName" v-model.trim="editForm.otherName" type="text" />
          </div>

          <div>
            <label for="gender">Gender</label>
            <select id="gender" v-model="editForm.gender" required>
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div>
            <label for="dateOfBirth">Date of Birth</label>
            <input id="dateOfBirth" v-model="editForm.dateOfBirth" type="date" required />
          </div>

          <p v-if="updateErrorMessage">
            {{ updateErrorMessage }}
          </p>

          <button type="submit" :disabled="isUpdating">
            {{ isUpdating ? 'Saving...' : 'Save Changes' }}
          </button>

          <button type="button" :disabled="isUpdating" @click="handleCancelEdit">Cancel</button>
        </form>
      </section>

      <section>
        <h2>Personal Information</h2>

        <p>
          <strong>Admission Number:</strong>
          {{ student.admissionNumber }}
        </p>

        <p><strong>First Name:</strong> {{ student.firstName }}</p>
        <p><strong>Other Name:</strong> {{ student.otherName || '—' }}</p>
        <p><strong>Surname:</strong> {{ student.surname }}</p>
        <p><strong>Gender:</strong> {{ student.gender }}</p>
        <p><strong>Date of Birth:</strong> {{ student.dateOfBirth }}</p>
      </section>

      <section>
        <h2>Academic Information</h2>

        <p>
          <strong>Current Class:</strong>
          {{ student.class?.name || 'Not assigned' }}
        </p>

        <p>
          <strong>Enrollment Type:</strong>
          {{ student.enrollment?.enrollmentType || '—' }}
        </p>

        <p>
          <strong>Academic Session:</strong>
          {{ student.enrollment?.academicSession?.name || '—' }}
        </p>

        <p>
          <strong>Entry Term:</strong>
          {{ student.enrollment?.entryTerm?.name || '—' }}
        </p>

        <p>
          <strong>Entry Class:</strong>
          {{ student.enrollment?.entryClass?.name || '—' }}
        </p>
      </section>
    </div>
  </div>
</template>
