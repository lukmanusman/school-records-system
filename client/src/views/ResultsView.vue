<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth.js'

import { getResults, createResult, updateResult } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getSubjects } from '../services/subjects.js'
import { getClassSubjects } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'
import { getTeacherAssignments } from '../services/teacherAssignments.js'

const { user } = useAuth()

const isStudent = computed(() => user.value?.role === 'STUDENT')
const isTeacher = computed(() => user.value?.role === 'TEACHER')

const results = ref([])
const gridScores = ref({})
const savingGridCell = ref(null)
const students = ref([])
const gridStudents = ref([])
const subjects = ref([])
const academicSessions = ref([])
const terms = ref([])
const teacherAssignments = ref([])
const classSubjects = ref([])
const classes = ref([])

const filterStudentId = ref('')
const filterSubjectId = ref('')
const filterSessionId = ref('')
const filterTermId = ref('')
const filterClassId = ref('')

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
const gridSaveErrorMessage = ref('')
const gridSaveSuccessMessage = ref('')

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

const classesForFilter = computed(() => {
  return classes.value
})

const subjectsForSelectedClass = computed(() => {
  if (!filterClassId.value) {
    return []
  }

  return classSubjects.value.filter(
    (classSubject) => Number(classSubject.classId) === Number(filterClassId.value),
  )
})

const studentsForGrid = computed(() => {
  if (!filterClassId.value) {
    return []
  }

  return gridStudents.value.filter(
    (student) => Number(student.classId) === Number(filterClassId.value),
  )
})

const resultLookup = computed(() => {
  const lookup = new Map()

  results.value.forEach((result) => {
    const key = `${result.studentId}-${result.subjectId}`
    lookup.set(key, result)
  })

  return lookup
})

const isGridReady = computed(() => {
  return Boolean(filterSessionId.value && filterTermId.value && filterClassId.value)
})

const getResultForCell = (studentId, subjectId) => {
  const key = `${studentId}-${subjectId}`
  return resultLookup.value.get(key) || null
}

const getGridTotal = (score) => {
  if (!score) {
    return 'ABS'
  }

  if (score.caStatus === 'ABSENT' && score.examStatus === 'ABSENT') {
    return 'ABS'
  }

  const caScore = score.caStatus === 'ABSENT' ? 0 : Number(score.caScore)
  const examScore = score.examStatus === 'ABSENT' ? 0 : Number(score.examScore)

  return caScore + examScore
}

const getGridGrade = (score) => {
  const total = getGridTotal(score)

  if (total === 'ABS') {
    return 'ABS'
  }

  if (total >= 70) return 'A'
  if (total >= 60) return 'B'
  if (total >= 50) return 'C'
  if (total >= 45) return 'D'
  if (total >= 40) return 'E'

  return 'F'
}

const initializeGridScores = () => {
  const scores = {}

  studentsForGrid.value.forEach((student) => {
    subjectsForSelectedClass.value.forEach((classSubject) => {
      const subjectId = classSubject.subjectId
      const result = getResultForCell(student.id, subjectId)

      const key = `${student.id}-${subjectId}`

      scores[key] = {
        resultId: result?.id ?? null,
        caStatus: result?.caStatus ?? 'PRESENT',
        caScore: result?.caScore ?? 0,
        examStatus: result?.examStatus ?? 'PRESENT',
        examScore: result?.examScore ?? 0,
        status: result?.status ?? 'DRAFT',
      }
    })
  })

  gridScores.value = scores
}

const updateGridScore = (studentId, subjectId, field, value) => {
  const key = `${studentId}-${subjectId}`

  if (!gridScores.value[key]) {
    return
  }

  gridScores.value[key] = {
    ...gridScores.value[key],
    [field]: value,
  }
}

const saveGridCell = async (student, classSubject) => {
  const subjectId = classSubject.subjectId
  const key = `${student.id}-${subjectId}`
  const score = gridScores.value[key]

  if (!score || !canEditSubject(subjectId)) {
    return
  }

  if (score.status === 'APPROVED') {
    gridSaveErrorMessage.value = 'Approved results cannot be edited.'
    return
  }

  gridSaveErrorMessage.value = ''
  gridSaveSuccessMessage.value = ''

  if (
    score.caStatus === 'PRESENT' &&
    (score.caScore === '' ||
      score.caScore === null ||
      !Number.isFinite(Number(score.caScore)) ||
      Number(score.caScore) < 0 ||
      Number(score.caScore) > 40)
  ) {
    gridSaveErrorMessage.value = 'CA score must be between 0 and 40.'
    return
  }

  if (
    score.examStatus === 'PRESENT' &&
    (score.examScore === '' ||
      score.examScore === null ||
      !Number.isFinite(Number(score.examScore)) ||
      Number(score.examScore) < 0 ||
      Number(score.examScore) > 60)
  ) {
    gridSaveErrorMessage.value = 'Examination score must be between 0 and 60.'
    return
  }

  const resultData = {
    studentId: Number(student.id),
    subjectId: Number(subjectId),
    academicSessionId: Number(filterSessionId.value),
    termId: Number(filterTermId.value),

    caStatus: score.caStatus,
    caScore: score.caStatus === 'ABSENT' ? null : Number(score.caScore),

    examStatus: score.examStatus,
    examScore: score.examStatus === 'ABSENT' ? null : Number(score.examScore),
  }

  savingGridCell.value = key

  try {
    let response

    if (score.resultId) {
      response = await updateResult(score.resultId, resultData)
    } else {
      response = await createResult(resultData)
    }

    gridSaveSuccessMessage.value = response.message || 'Result saved successfully.'

    await loadResults()

    const savedResult = results.value.find(
      (result) =>
        Number(result.studentId) === Number(student.id) &&
        Number(result.subjectId) === Number(subjectId),
    )

    if (savedResult && gridScores.value[key]) {
      gridScores.value[key].resultId = savedResult.id
      gridScores.value[key].status = savedResult.status
    }
  } catch (error) {
    console.error('Error saving grid result:', error)
    gridSaveErrorMessage.value = error.message
  } finally {
    savingGridCell.value = null
  }
}

const canEditSubject = (subjectId) => {
  if (!isTeacher.value || !filterClassId.value || !user.value?.id) {
    return false
  }

  return teacherAssignments.value.some((assignment) => {
    return (
      Number(assignment.teacher?.userId) === Number(user.value.id) &&
      Number(assignment.classId) === Number(filterClassId.value) &&
      Number(assignment.subjectId) === Number(subjectId)
    )
  })
}

watch(filterClassId, (classId) => {
  if (classId) {
    console.log('Selected class ID:', classId)
    console.log('Can edit Mathematics:', canEditSubject(1))
  }
})

const studentsForFilter = computed(() => {
  if (!filterClassId.value) {
    return students.value
  }

  return students.value.filter((student) => String(student.classId) === String(filterClassId.value))
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

    if (filterClassId.value) {
      filters.classId = filterClassId.value
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

    classSubjects.value = await getClassSubjects()
    classes.value = await getClasses()

    if (isTeacher.value) {
      teacherAssignments.value = await getTeacherAssignments()
      console.log('Teacher assignments loaded:', teacherAssignments.value.length)
      console.log('Is teacher:', isTeacher.value)
      console.log('Can edit Mathematics:', canEditSubject(1))
      console.log('Logged-in user details:', JSON.stringify(user.value, null, 2))

      console.log('Loaded teacher assignments:', JSON.stringify(teacherAssignments.value, null, 2))
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

watch([filterStudentId, filterSubjectId, filterSessionId, filterTermId, filterClassId], () => {
  loadResults()
})

watch([filterSessionId, filterTermId], async ([sessionId, termId]) => {
  gridStudents.value = []

  if (!sessionId || !termId) {
    return
  }

  isLoadingReferences.value = true
  errorMessage.value = ''

  try {
    gridStudents.value = await getStudents(sessionId, termId)
  } catch (error) {
    console.error('Error loading students for result entry:', error)
    errorMessage.value = error.message
  } finally {
    isLoadingReferences.value = false
  }
})

watch(
  [gridStudents, results, filterClassId],
  () => {
    if (!isGridReady.value) {
      gridScores.value = {}
      return
    }

    initializeGridScores()
  },
  { deep: true },
)

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
      <h2>Class Result Entry</h2>

      <p>Select an academic session, term, and class to load the result-entry grid.</p>

      <form class="grid-filters" @submit.prevent="loadResults">
        <div>
          <label for="gridSessionFilter">Academic Session</label>
          <select id="gridSessionFilter" v-model="filterSessionId" required>
            <option value="">Select session</option>
            <option v-for="session in academicSessions" :key="session.id" :value="session.id">
              {{ session.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="gridTermFilter">Term</label>
          <select
            id="gridTermFilter"
            v-model="filterTermId"
            :disabled="!filterSessionId || isLoadingTerms"
            required
          >
            <option value="">Select term</option>
            <option v-for="term in terms" :key="term.id" :value="term.id">
              {{ term.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="gridClassFilter">Class</label>
          <select id="gridClassFilter" v-model="filterClassId" required>
            <option value="">Select class</option>
            <option
              v-for="schoolClass in classesForFilter"
              :key="schoolClass.id"
              :value="schoolClass.id"
            >
              {{ schoolClass.name }}
            </option>
          </select>
        </div>
      </form>

      <p v-if="isLoadingReferences">Loading reference data...</p>

      <p v-else-if="!isGridReady">Select all three filters to display the result-entry grid.</p>

      <div v-if="isGridReady" class="result-grid-wrapper">
        <table class="result-grid">
          <thead>
            <tr>
              <th rowspan="2">Student</th>

              <th
                v-for="classSubject in subjectsForSelectedClass"
                :key="classSubject.id"
                colspan="2"
              >
                {{ classSubject.subject.name }}
              </th>
            </tr>

            <tr>
              <template v-for="classSubject in subjectsForSelectedClass" :key="classSubject.id">
                <th>CA (40)</th>
                <th>Exam (60)</th>
              </template>
            </tr>
          </thead>

          <tbody>
            <tr v-for="student in studentsForGrid" :key="student.id">
              <td>{{ student.firstName }} {{ student.surname }}</td>

              <template v-for="classSubject in subjectsForSelectedClass" :key="classSubject.id">
                <td>
                  <template v-if="canEditSubject(classSubject.subjectId)">
                    <select
                      v-model="gridScores[`${student.id}-${classSubject.subjectId}`].caStatus"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                    >
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                    </select>

                    <input
                      v-if="
                        gridScores[`${student.id}-${classSubject.subjectId}`].caStatus === 'PRESENT'
                      "
                      v-model.number="gridScores[`${student.id}-${classSubject.subjectId}`].caScore"
                      type="number"
                      min="0"
                      max="40"
                      step="any"
                      class="score-input"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                    />
                    <span v-else>ABS</span>
                  </template>

                  <template v-else>
                    {{
                      gridScores[`${student.id}-${classSubject.subjectId}`].caStatus === 'ABSENT'
                        ? 'ABS'
                        : gridScores[`${student.id}-${classSubject.subjectId}`].caScore
                    }}
                  </template>
                </td>

                <td>
                  <template v-if="canEditSubject(classSubject.subjectId)">
                    <select
                      v-model="gridScores[`${student.id}-${classSubject.subjectId}`].examStatus"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                    >
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                    </select>

                    <input
                      v-if="
                        gridScores[`${student.id}-${classSubject.subjectId}`].examStatus ===
                        'PRESENT'
                      "
                      v-model.number="
                        gridScores[`${student.id}-${classSubject.subjectId}`].examScore
                      "
                      type="number"
                      min="0"
                      max="60"
                      step="any"
                      class="score-input"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                    />

                    <button
                      type="button"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                      @click="saveGridCell(student, classSubject)"
                    >
                      {{
                        savingGridCell === `${student.id}-${classSubject.subjectId}`
                          ? 'Saving...'
                          : 'Save'
                      }}
                    </button>
                  </template>

                  <template v-else>
                    {{
                      gridScores[`${student.id}-${classSubject.subjectId}`].examStatus === 'ABSENT'
                        ? 'ABS'
                        : gridScores[`${student.id}-${classSubject.subjectId}`].examScore
                    }}
                  </template>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
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
          <label for="classFilter">Class</label>
          <select id="classFilter" v-model="filterClassId">
            <option value="">All classes</option>
            <option
              v-for="schoolClass in classesForFilter"
              :key="schoolClass.id"
              :value="schoolClass.id"
            >
              {{ schoolClass.name }}
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

.result-grid-wrapper {
  overflow-x: auto;
}

.result-grid {
  min-width: 100%;
  width: max-content;
}

.result-grid th,
.result-grid td {
  text-align: center;
  vertical-align: middle;
}

.result-grid th:first-child,
.result-grid td:first-child {
  text-align: left;
}

.score-input {
  width: 4.5rem;
  min-width: 0;
  padding: 0.4rem;
}
</style>
