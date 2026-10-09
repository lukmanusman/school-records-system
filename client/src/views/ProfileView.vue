<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { saveAuth } from '../services/authStorage.js'
import { getMyProfile, uploadProfileImage } from '../services/profileImage.js'

const { token, user } = useAuth()

const selectedFile = ref(null)
const previewUrl = ref('')
const isLoading = ref(true)
const isUploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const MAX_FILE_SIZE = 200 * 1024

const initials = computed(() => {
  if (!user.value?.email) return '?'

  return user.value.email.charAt(0).toUpperCase()
})

const loadProfile = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const profile = await getMyProfile()

    const updatedUser = {
      ...user.value,
      ...profile,
    }

    user.value = updatedUser

    if (token.value) {
      saveAuth({
        token: token.value,
        user: updatedUser,
      })
    }
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]

  selectedFile.value = null
  successMessage.value = ''
  errorMessage.value = ''

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }

  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Choose a JPEG, PNG, or WebP image.'
    event.target.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = 'The image must not exceed 200 KB.'
    event.target.value = ''
    return
  }

  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

const handleUpload = async () => {
  if (!selectedFile.value || isUploading.value) return

  isUploading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const updatedProfile = await uploadProfileImage(selectedFile.value)

    const updatedUser = {
      ...user.value,
      ...updatedProfile,
    }

    user.value = updatedUser

    if (token.value) {
      saveAuth({
        token: token.value,
        user: updatedUser,
      })
    }

    selectedFile.value = null

    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }

    successMessage.value = 'Profile picture updated successfully.'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isUploading.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div>
    <h1>My Profile</h1>

    <p v-if="isLoading">Loading profile...</p>

    <div v-else-if="user">
      <div>
        <img
          v-if="previewUrl || user.profileImageUrl"
          :src="previewUrl || user.profileImageUrl"
          alt="Profile picture"
          width="120"
          height="120"
          style="object-fit: cover; border-radius: 50%"
        />

        <div
          v-else
          role="img"
          aria-label="Profile picture placeholder"
          style="
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e5e7eb;
            color: #374151;
            font-size: 2rem;
          "
        >
          {{ initials }}
        </div>
      </div>

      <div>
        <label for="profileImage">Choose a profile picture</label>
        <input
          id="profileImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="handleFileChange"
        />
      </div>

      <button type="button" :disabled="!selectedFile || isUploading" @click="handleUpload">
        {{ isUploading ? 'Uploading...' : 'Upload picture' }}
      </button>

      <p v-if="errorMessage" role="alert">
        {{ errorMessage }}
      </p>

      <p v-if="successMessage" role="status">
        {{ successMessage }}
      </p>

      <p>
        <strong>Email:</strong>
        {{ user.email }}
      </p>

      <p>
        <strong>Role:</strong>
        {{ user.role }}
      </p>
    </div>

    <div>
      <RouterLink :to="{ name: 'change-password' }"> Change Password </RouterLink>
    </div>
  </div>
</template>
