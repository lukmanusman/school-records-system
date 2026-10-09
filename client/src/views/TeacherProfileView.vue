<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import API_BASE_URL from '../services/api.js'
import { getToken } from '../services/authStorage.js'
import { updateTeacher } from '../services/teachers.js'

const route = useRoute()
const { user } = useAuth()

const teacher = ref(null)
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
  email: '',
})

const canEdit = computed(() => user.value?.role === 'ADMIN')

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

const handleEdit = () => {
  if (!teacher.value) return

  Object.assign(editForm, {
    firstName: teacher.value.firstName,
    surname: teacher.value.surname,
    otherName: teacher.value.otherName || '',
    email: teacher.value.email,
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
  isUpdating.value = true
  updateErrorMessage.value = ''
  successMessage.value = ''

  try {
    await updateTeacher(teacher.value.id, { ...editForm })
    await loadTeacher()

    isEditing.value = false
    successMessage.value = 'Teacher profile updated successfully.'
  } catch (error) {
    console.error('Error updating teacher:', error)
    updateErrorMessage.value = error.message
  } finally {
    isUpdating.value = false
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
      <div>
        <h2>
          {{ teacher.firstName }}
          {{ teacher.otherName ? teacher.otherName + ' ' : '' }}
          {{ teacher.surname }}
        </h2>

        <button v-if="canEdit && !isEditing" type="button" @click="handleEdit">Edit Profile</button>
      </div>

      <p v-if="successMessage">{{ successMessage }}</p>

      <section v-if="isEditing">
        <h2>Edit Teacher Profile</h2>

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
            <label for="email">Email</label>
            <input id="email" v-model.trim="editForm.email" type="email" required />
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

        <p><strong>First Name:</strong> {{ teacher.firstName }}</p>
        <p><strong>Other Name:</strong> {{ teacher.otherName || '—' }}</p>
        <p><strong>Surname:</strong> {{ teacher.surname }}</p>
        <p><strong>Email:</strong> {{ teacher.email }}</p>
        <p><strong>Teacher ID:</strong> {{ teacher.id }}</p>
      </section>
    </div>
  </div>
</template>
