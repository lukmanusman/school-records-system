<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'
import { getClasses } from '../services/classes.js'
import { enrollStudent } from '../services/enrollments.js'

const form = reactive({
  firstName: '',
  surname: '',
  otherName: '',
  gender: '',
  dateOfBirth: '',
  email: '',
  password: '',
  enrollmentType: '',
  academicSessionId: '',
  entryTermId: '',
  entryClassId: '',
})

const academicSessions = ref([])
const isLoadingSessions = ref(false)
const terms = ref([])
const isLoadingTerms = ref(false)
const errorMessage = ref('')
const classes = ref([])
const isLoadingClasses = ref(false)
const isSubmitting = ref(false)
const successMessage = ref('')

const loadAcademicSessions = async () => {
  isLoadingSessions.value = true
  errorMessage.value = ''

  try {
    academicSessions.value = await getAcademicSessions()
  } catch (error) {
    console.error('Error loading academic sessions:', error)
    errorMessage.value = error.message
  } finally {
    isLoadingSessions.value = false
  }
}

const loadTerms = async (academicSessionId) => {
  terms.value = []

  if (!academicSessionId) {
    return
  }

  isLoadingTerms.value = true
  errorMessage.value = ''

  try {
    terms.value = await getTerms(academicSessionId)
  } catch (error) {
    console.error('Error loading terms:', error)
    errorMessage.value = error.message
  } finally {
    isLoadingTerms.value = false
  }
}

const loadClasses = async () => {
  isLoadingClasses.value = true
  errorMessage.value = ''

  try {
    classes.value = await getClasses()
  } catch (error) {
    console.error('Error loading classes:', error)
    errorMessage.value = error.message
  } finally {
    isLoadingClasses.value = false
  }
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  isSubmitting.value = true

  try {
    const result = await enrollStudent(form)

    successMessage.value = `Student enrolled successfully. Admission Number: ${result.student.admissionNumber}`

    Object.assign(form, {
      firstName: '',
      surname: '',
      otherName: '',
      gender: '',
      dateOfBirth: '',
      email: '',
      password: '',
      enrollmentType: '',
      academicSessionId: '',
      entryTermId: '',
      entryClassId: '',
    })

    terms.value = []
  } catch (error) {
    console.error('Enrollment error:', error)
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => form.academicSessionId,
  (academicSessionId) => {
    form.entryTermId = ''
    loadTerms(academicSessionId)
  },
)

onMounted(() => {
  loadAcademicSessions()
  loadAcademicSessions()
  loadClasses()
})
</script>

<template>
  <div>
    <h1>Enroll Student</h1>

    <p>Register a new student and create their initial enrollment record.</p>

    <section>
      <h2>Student Information</h2>

      <form @submit.prevent="handleSubmit">
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
          <label for="gender">Gender</label>
          <select id="gender" v-model="form.gender">
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        <div>
          <label for="dateOfBirth">Date of Birth</label>
          <input id="dateOfBirth" v-model="form.dateOfBirth" type="date" />
        </div>

        <div>
          <label for="email">Student Email</label>
          <input id="email" v-model="form.email" type="email" />
        </div>

        <div>
          <label for="password">Password</label>
          <input id="password" v-model="form.password" type="password" />
        </div>

        <div>
          <label for="enrollmentType">Enrollment Type</label>
          <select id="enrollmentType" v-model="form.enrollmentType">
            <option value="">Select enrollment type</option>
            <option value="FRESHER">Fresher</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>

        <div>
          <label for="academicSession">Academic Session</label>

          <select
            id="academicSession"
            v-model="form.academicSessionId"
            :disabled="isLoadingSessions"
          >
            <option value="">
              {{ isLoadingSessions ? 'Loading sessions...' : 'Select academic session' }}
            </option>

            <option v-for="session in academicSessions" :key="session.id" :value="session.id">
              {{ session.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="entryTerm">Entry Term</label>

          <select
            id="entryTerm"
            v-model="form.entryTermId"
            :disabled="!form.academicSessionId || isLoadingTerms"
          >
            <option value="">
              {{
                !form.academicSessionId
                  ? 'Select academic session first'
                  : isLoadingTerms
                    ? 'Loading terms...'
                    : 'Select entry term'
              }}
            </option>

            <option v-for="term in terms" :key="term.id" :value="term.id">
              {{ term.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="entryClass">Entry Class</label>

          <select id="entryClass" v-model="form.entryClassId" :disabled="isLoadingClasses">
            <option value="">
              {{ isLoadingClasses ? 'Loading classes...' : 'Select entry class' }}
            </option>

            <option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">
              {{ schoolClass.name }}
            </option>
          </select>
        </div>

        <p v-if="successMessage">
          {{ successMessage }}
        </p>

        <p v-if="errorMessage">
          {{ errorMessage }}
        </p>

        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Enrolling...' : 'Enroll Student' }}
        </button>
      </form>
    </section>
  </div>
</template>
