<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth.js'

import { getResults } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getSubjects } from '../services/subjects.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'

const { user } = useAuth()

const isStudent = computed(() => user.value?.role === 'STUDENT')

const results = ref([])
const students = ref([])
const subjects = ref([])
const academicSessions = ref([])
const terms = ref([])

const filterStudentId = ref('')
const filterSubjectId = ref('')
const filterSessionId = ref('')
const filterTermId = ref('')

const isLoading = ref(false)
const isLoadingReferences = ref(false)
const isLoadingTerms = ref(false)

const errorMessage = ref('')

const loadResults = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const filters = {}

    // Students can view only their own published results.
    // The backend enforces this independently of the filters.
    if (!isStudent.value) {
      if (filterStudentId.value) {
        filters.studentId = filterStudentId.value
      }

      if (filterSubjectId.value) {
        filters.subjectId = filterSubjectId.value
      }
    }

    if (filterSessionId.value) {
      filters.academicSessionId = filterSessionId.value
    }

    if (filterTermId.value) {
      filters.termId = filterTermId.value
    }

    results.value = await getResults(filters)
  } catch (error) {
    console.error('Error loading results:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const loadReferenceData = async () => {
  isLoadingReferences.value = true

  try {
    academicSessions.value = await getAcademicSessions()

    // Students should not need access to the list of all students
    // or the administrative subject filter.
    if (!isStudent.value) {
      const [studentsData, subjectsData] = await Promise.all([getStudents(), getSubjects()])

      students.value = studentsData
      subjects.value = subjectsData
    }
  } catch (error) {
    console.error('Error loading result filters:', error)
    errorMessage.value = error.message
  } finally {
    isLoadingReferences.value = false
  }
}

watch(filterSessionId, async (sessionId) => {
  filterTermId.value = ''
  terms.value = []

  if (!sessionId) {
    return
  }

  isLoadingTerms.value = true

  try {
    terms.value = await getTerms(sessionId)
  } catch (error) {
    console.error('Error loading terms:', error)
    errorMessage.value = error.message
  } finally {
    isLoadingTerms.value = false
  }
})

const resetFilters = async () => {
  filterStudentId.value = ''
  filterSubjectId.value = ''
  filterSessionId.value = ''
  filterTermId.value = ''

  terms.value = []

  await loadResults()
}

onMounted(async () => {
  await Promise.all([loadReferenceData(), loadResults()])
})
</script>

<template>
  <main>
    <h1>Results</h1>

    <section>
      <h2>Filter Results</h2>

      <p v-if="isLoadingReferences">Loading filter options...</p>

      <form @submit.prevent="loadResults">
        <div v-if="!isStudent">
          <label for="studentFilter">Student</label>
          <select id="studentFilter" v-model="filterStudentId">
            <option value="">All students</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.admissionNumber }} — {{ student.firstName }} {{ student.surname }}
            </option>
          </select>
        </div>

        <div v-if="!isStudent">
          <label for="subjectFilter">Subject</label>
          <select id="subjectFilter" v-model="filterSubjectId">
            <option value="">All subjects</option>
            <option v-for="subject in subjects" :key="subject.id" :value="subject.id">
              {{ subject.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="sessionFilter">Academic Session</label>
          <select id="sessionFilter" v-model="filterSessionId">
            <option value="">All sessions</option>
            <option v-for="session in academicSessions" :key="session.id" :value="session.id">
              {{ session.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="termFilter">Term</label>
          <select
            id="termFilter"
            v-model="filterTermId"
            :disabled="!filterSessionId || isLoadingTerms"
          >
            <option value="">All terms</option>
            <option v-for="term in terms" :key="term.id" :value="term.id">
              {{ term.name }}
            </option>
          </select>
        </div>

        <div class="filter-actions">
          <button type="submit" :disabled="isLoading">
            {{ isLoading ? 'Loading...' : 'Apply Filters' }}
          </button>

          <button type="button" :disabled="isLoading" @click="resetFilters">Reset</button>
        </div>
      </form>
    </section>

    <section>
      <h2>Result Records</h2>

      <p v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </p>

      <p v-if="isLoading">Loading results...</p>

      <p v-else-if="!errorMessage && results.length === 0">
        No results found for the selected filters.
      </p>

      <div v-else-if="!errorMessage" class="table-container">
        <p>Total results: {{ results.length }}</p>

        <table>
          <thead>
            <tr>
              <th>Admission No.</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Session</th>
              <th>Term</th>
              <th>CA / 40</th>
              <th>Exam / 60</th>
              <th>Total / 100</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="result in results" :key="result.id">
              <td>{{ result.student.admissionNumber }}</td>

              <td>
                {{ result.student.firstName }}
                {{ result.student.surname }}
              </td>

              <td>{{ result.subject.name }}</td>

              <td>{{ result.academicSession.name }}</td>

              <td>{{ result.term.name }}</td>

              <td>
                {{ result.caStatus === 'ABSENT' ? 'Absent' : result.caScore }}
              </td>

              <td>
                {{ result.examStatus === 'ABSENT' ? 'Absent' : result.examScore }}
              </td>

              <td>
                {{ result.totalScore === 'ABS' ? 'Absent' : result.totalScore }}
              </td>

              <td>{{ result.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
section {
  margin-bottom: 2rem;
}

form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem;
}

form > div {
  display: grid;
  gap: 0.35rem;
}

select,
button {
  padding: 0.5rem;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.table-container {
  overflow-x: auto;
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
  white-space: nowrap;
  border-bottom: 1px solid #ddd;
}

.error-message {
  color: #b91c1c;
}
</style>
