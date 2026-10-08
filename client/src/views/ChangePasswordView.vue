<script setup>
import { reactive, ref } from 'vue'
import { changePassword } from '../services/password.js'

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const isChanging = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleChangePassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.newPassword !== form.confirmPassword) {
    errorMessage.value = 'New passwords do not match'
    return
  }

  isChanging.value = true

  try {
    await changePassword(form.currentPassword, form.newPassword)

    successMessage.value = 'Password changed successfully'

    Object.assign(form, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    errorMessage.value = error.message
  } finally {
    isChanging.value = false
  }
}
</script>

<template>
  <div>
    <h1>Change Password</h1>

    <form @submit.prevent="handleChangePassword">
      <div>
        <label for="currentPassword"> Current Password </label>

        <input id="currentPassword" v-model="form.currentPassword" type="password" required />
      </div>

      <div>
        <label for="newPassword"> New Password </label>

        <input id="newPassword" v-model="form.newPassword" type="password" required />
      </div>

      <div>
        <label for="confirmPassword"> Confirm New Password </label>

        <input id="confirmPassword" v-model="form.confirmPassword" type="password" required />
      </div>

      <p v-if="errorMessage">
        {{ errorMessage }}
      </p>

      <p v-if="successMessage">
        {{ successMessage }}
      </p>

      <button type="submit" :disabled="isChanging">
        {{ isChanging ? 'Changing Password...' : 'Change Password' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
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
  margin-top: 0.5rem;
}
</style>
