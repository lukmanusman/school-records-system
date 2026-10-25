<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth.js'

import { getResults, createResult, updateResult } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getSubjects } from '../services/subjects.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'
import { getTeacherAssignments } from '../services/teacherAssignments.js'

const { user } = useAuth()

const isStudent = computed(() => user.value?.role === 'STUDENT')
const isTeacher = computed(() => user.value?.role === 'TEACHER')

const results = ref([])
const students = ref([])
const subjects = ref([])
const academicSessions = ref([])
const terms = ref([])
const teacherAssignments = ref([])

const filterStudentId = ref('')
const filterSubjectId = ref('')
const filterSessionId = ref('')
const filterTermId = ref('')

// Result-entry form
const formStudentId = ref('')
const formSubjectId = ref('')
const formSessionId = ref('')
const formTermId = ref('')
const formTerms = ref([])

const formCaStatus = ref('PRESENT')
const formCaScore = ref(0)

const formExamStatus = ref('PRESENT')
const formExamScore = ref(0)

// Result-editing form
const editingResultId = ref(null)
const editCaStatus = ref('PRESENT')
const editCaScore = ref(0)
const editExamStatus = ref('PRESENT')
const editExamScore = ref(0)

const isUpdating = ref(false)
const updateErrorMessage = ref('')
const updateSuccessMessage = ref('')

const isCreating = ref(false)
const createErrorMessage = ref('')
const createSuccessMessage = ref('')

const isLoading = ref(false)
const isLoadingReferences = ref(false)
const isLoadingTerms = ref(false)

const errorMessage = ref('')

const studentsForForm = computed(() => {
  if (!isTeacher.value) {
    return []
  }

  const assignedClassIds = new Set(
    teacherAssignments.value
      .filter((assignment) => assignment.teacher?.userId === user.value?.id)
      .map((assignment) => assignment.classId),
  )

  return students.value.filter(
    (student) => student.classId && assignedClassIds.has(student.classId),
  )
})

const subjectsForSelectedStudent = computed(() => {
  const student = students.value.find((item) => item.id === Number(formStudentId.value))

  if (!student || !isTeacher.value) {
    return []
  }

  return teacherAssignments.value
    .filter(
      (assignment) =>
        assignment.teacher?.userId === user.value?.id && assignment.classId === student.classId,
    )
    .map((assignment) => assignment.subject)
})

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

    if (!isStudent.value) {
      const subjectsData = await getSubjects()
      subjects.value = subjectsData
    }

    if (isTeacher.value) {
      teacherAssignments.value = await getTeacherAssignments()
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

watch(formSessionId, async (sessionId) => {
  formTermId.value = ''
  formTerms.value = []

  if (!sessionId) {
    return
  }

  createErrorMessage.value = ''

  try {
    formTerms.value = await getTerms(sessionId)
  } catch (error) {
    console.error('Error loading form terms:', error)
    createErrorMessage.value = error.message
  }
})

watch(formStudentId, () => {
  // Clear the selected subject whenever the student changes,
  // because the student's class determines eligible subjects.
  formSubjectId.value = ''
})

watch([formSessionId, formTermId], async ([sessionId, termId]) => {
  formStudentId.value = ''
  formSubjectId.value = ''
  students.value = []

  if (!sessionId || !termId || isStudent.value) {
    return
  }

  isLoadingReferences.value = true
  createErrorMessage.value = ''

  try {
    students.value = await getStudents(sessionId, termId)
  } catch (error) {
    console.error('Error loading students for selected period:', error)
    createErrorMessage.value = error.message
  } finally {
    isLoadingReferences.value = false
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

const handleCreateResult = async () => {
  createErrorMessage.value = ''
  createSuccessMessage.value = ''

  if (!formStudentId.value || !formSubjectId.value || !formSessionId.value || !formTermId.value) {
    createErrorMessage.value = 'Please select a student, subject, academic session, and term.'
    return
  }

  isCreating.value = true

  try {
    const resultData = {
      studentId: Number(formStudentId.value),
      subjectId: Number(formSubjectId.value),
      academicSessionId: Number(formSessionId.value),
      termId: Number(formTermId.value),

      caStatus: formCaStatus.value,
      caScore: formCaStatus.value === 'ABSENT' ? null : Number(formCaScore.value),

      examStatus: formExamStatus.value,
      examScore: formExamStatus.value === 'ABSENT' ? null : Number(formExamScore.value),
    }

    const response = await createResult(resultData)

    createSuccessMessage.value = response.message || 'Result created successfully.'

    // Clear the student and subject selections after success.
    formStudentId.value = ''
    formSubjectId.value = ''

    // Reset the assessment fields for the next entry.
    formCaStatus.value = 'PRESENT'
    formCaScore.value = 0
    formExamStatus.value = 'PRESENT'
    formExamScore.value = 0

    await loadResults()
  } catch (error) {
    console.error('Error creating result:', error)
    createErrorMessage.value = error.message
  } finally {
    isCreating.value = false
  }
}

const canEditResult = (result) => {
  if (!isTeacher.value || result.status === 'APPROVED') {
    return false
  }

  return teacherAssignments.value.some(
    (assignment) =>
      assignment.teacher?.userId === user.value?.id &&
      assignment.subjectId === result.subjectId &&
      assignment.classId === result.classId,
  )
}

const startEditingResult = (result) => {
  if (!canEditResult(result)) {
    return
  }

  editingResultId.value = result.id

  editCaStatus.value = result.caStatus
  editCaScore.value = result.caScore ?? 0

  editExamStatus.value = result.examStatus
  editExamScore.value = result.examScore ?? 0

  updateErrorMessage.value = ''
  updateSuccessMessage.value = ''
}

const cancelEditingResult = () => {
  editingResultId.value = null
  updateErrorMessage.value = ''
  updateSuccessMessage.value = ''
}

const handleUpdateResult = async () => {
  updateErrorMessage.value = ''
  updateSuccessMessage.value = ''

  if (!editingResultId.value) {
    return
  }

  isUpdating.value = true

  try {
    const resultData = {
      caStatus: editCaStatus.value,
      caScore: editCaStatus.value === 'ABSENT' ? null : Number(editCaScore.value),

      examStatus: editExamStatus.value,
      examScore: editExamStatus.value === 'ABSENT' ? null : Number(editExamScore.value),
    }

    const response = await updateResult(editingResultId.value, resultData)

    updateSuccessMessage.value = response.message || 'Result updated successfully.'

    editingResultId.value = null

    await loadResults()
  } catch (error) {
    console.error('Error updating result:', error)
    updateErrorMessage.value = error.message
  } finally {
    isUpdating.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadReferenceData(), loadResults()])
})
</script>

<template>
  <main>
    <h1>Results</h1>

    <section v-if="isTeacher">
      <h2>Enter Student Result</h2>

      <p v-if="studentsForForm.length === 0 && !isLoadingReferences">
        No students found in your assigned classes.
      </p>

      <form @submit.prevent="handleCreateResult">
        <div>
          <label for="formStudentId">Student</label>
          <select id="formStudentId" v-model="formStudentId" required>
            <option value="" disabled>Select a student</option>
            <option v-for="student in studentsForForm" :key="student.id" :value="student.id">
              {{ student.admissionNumber }} — {{ student.firstName }} {{ student.surname }}
            </option>
          </select>
        </div>

        <div>
          <label for="formSubjectId">Subject</label>
          <select
            id="formSubjectId"
            v-model="formSubjectId"
            :disabled="!formStudentId || subjectsForSelectedStudent.length === 0"
            required
          >
            <option value="" disabled>Select a subject</option>
            <option
              v-for="subject in subjectsForSelectedStudent"
              :key="subject.id"
              :value="subject.id"
            >
              {{ subject.name }}
            </option>
          </select>

          <small v-if="formStudentId && subjectsForSelectedStudent.length === 0">
            No subjects are assigned to you for this student's class.
          </small>
        </div>

        <div>
          <label for="formSessionId">Academic Session</label>
          <select id="formSessionId" v-model="formSessionId" required>
            <option value="" disabled>Select a session</option>
            <option v-for="session in academicSessions" :key="session.id" :value="session.id">
              {{ session.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="formTermId">Term</label>
          <select
            id="formTermId"
            v-model="formTermId"
            :disabled="!formSessionId || formTerms.length === 0"
            required
          >
            <option value="" disabled>Select a term</option>
            <option v-for="term in formTerms" :key="term.id" :value="term.id">
              {{ term.name }}
            </option>
          </select>
        </div>

        <fieldset>
          <legend>Continuous Assessment (CA) — 40 marks</legend>

          <label for="formCaStatus">CA Status</label>
          <select id="formCaStatus" v-model="formCaStatus" required>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>

          <div v-if="formCaStatus === 'PRESENT'">
            <label for="formCaScore">CA Score</label>
            <input
              id="formCaScore"
              v-model.number="formCaScore"
              type="number"
              min="0"
              max="40"
              step="any"
              required
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Examination — 60 marks</legend>

          <label for="formExamStatus">Examination Status</label>
          <select id="formExamStatus" v-model="formExamStatus" required>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>

          <div v-if="formExamStatus === 'PRESENT'">
            <label for="formExamScore">Examination Score</label>
            <input
              id="formExamScore"
              v-model.number="formExamScore"
              type="number"
              min="0"
              max="60"
              step="any"
              required
            />
          </div>
        </fieldset>

        <button
          type="submit"
          :disabled="
            isCreating ||
            isLoadingReferences ||
            !formStudentId ||
            !formSubjectId ||
            !formSessionId ||
            !formTermId
          "
        >
          {{ isCreating ? 'Saving Result...' : 'Save Result' }}
        </button>
      </form>

      <p v-if="createSuccessMessage" class="success-message">
        {{ createSuccessMessage }}
      </p>

      <p v-if="createErrorMessage" class="error-message">
        {{ createErrorMessage }}
      </p>
    </section>

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

      <p v-if="updateSuccessMessage" class="success-message">
        {{ updateSuccessMessage }}
      </p>

      <p v-if="updateErrorMessage" class="error-message">
        {{ updateErrorMessage }}
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
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <template v-for="result in results" :key="result.id">
              <tr>
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

                <td>
                  <button
                    v-if="canEditResult(result) && editingResultId !== result.id"
                    type="button"
                    @click="startEditingResult(result)"
                  >
                    Edit
                  </button>
                </td>
              </tr>

              <tr v-if="editingResultId === result.id">
                <td colspan="10">
                  <h3>
                    Edit Result:
                    {{ result.student.firstName }} {{ result.student.surname }} —
                    {{ result.subject.name }}
                  </h3>

                  <form @submit.prevent="handleUpdateResult">
                    <fieldset>
                      <legend>Continuous Assessment (CA) — 40 marks</legend>

                      <label :for="`edit-ca-status-${result.id}`"> CA Status </label>

                      <select :id="`edit-ca-status-${result.id}`" v-model="editCaStatus" required>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                      </select>

                      <div v-if="editCaStatus === 'PRESENT'">
                        <label :for="`edit-ca-score-${result.id}`"> CA Score </label>

                        <input
                          :id="`edit-ca-score-${result.id}`"
                          v-model.number="editCaScore"
                          type="number"
                          min="0"
                          max="40"
                          step="any"
                          required
                        />
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Examination — 60 marks</legend>

                      <label :for="`edit-exam-status-${result.id}`"> Examination Status </label>

                      <select
                        :id="`edit-exam-status-${result.id}`"
                        v-model="editExamStatus"
                        required
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                      </select>

                      <div v-if="editExamStatus === 'PRESENT'">
                        <label :for="`edit-exam-score-${result.id}`"> Examination Score </label>

                        <input
                          :id="`edit-exam-score-${result.id}`"
                          v-model.number="editExamScore"
                          type="number"
                          min="0"
                          max="60"
                          step="any"
                          required
                        />
                      </div>
                    </fieldset>

                    <button type="submit" :disabled="isUpdating">
                      {{ isUpdating ? 'Saving...' : 'Save Changes' }}
                    </button>

                    <button type="button" :disabled="isUpdating" @click="cancelEditingResult">
                      Cancel
                    </button>
                  </form>
                </td>
              </tr>
            </template>
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

fieldset {
  display: grid;
  gap: 0.75rem;
  border: 1px solid #ddd;
  padding: 1rem;
  margin: 1rem 0;
}

legend {
  font-weight: 600;
  padding: 0 0.35rem;
}

input {
  padding: 0.5rem;
}

.success-message {
  color: #15803d;
}

.error-message {
  color: #b91c1c;
}
</style>
