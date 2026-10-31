<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth.js'

import { getResults, createResult, updateResult } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getClassSubjects } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'
import { getTeacherAssignments } from '../services/teacherAssignments.js'

const { user } = useAuth()

const isTeacher = computed(() => user.value?.role === 'TEACHER')

const results = ref([])
const gridScores = ref({})
const savingGridCell = ref(null)
const gridStudents = ref([])
const academicSessions = ref([])
const terms = ref([])
const teacherAssignments = ref([])
const classSubjects = ref([])
const classes = ref([])

const filterSessionId = ref('')
const filterTermId = ref('')
const filterClassId = ref('')

// Result-editing form
const isLoading = ref(false)
const isLoadingReferences = ref(false)
const isLoadingTerms = ref(false)

const errorMessage = ref('')
const gridSaveErrorMessage = ref('')

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

const formatScore = (score) => {
  if (score === '' || score === null || score === undefined || score === '-') {
    return score
  }

  return String(score).padStart(2, '0')
}

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

      const caValue = result?.caStatus === 'ABSENT' ? '-' : formatScore(result?.caScore ?? '')
      const examValue = result?.examStatus === 'ABSENT' ? '-' : formatScore(result?.examScore ?? '')

      scores[key] = {
        resultId: result?.id ?? null,

        caScore: caValue,
        examScore: examValue,

        savedCaScore: caValue,
        savedExamScore: examValue,

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

const saveGridCell = async (student, classSubject, assessment) => {
  gridSaveErrorMessage.value = ''

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

  const inputValue = String(assessment === 'ca' ? score.caScore : score.examScore).trim()

  // Blank means this assessment has not been recorded.
  const isClearing = inputValue === ''
  const isAbsent = inputValue === '-'
  const numericScore = Number(inputValue)
  const maxScore = assessment === 'ca' ? 40 : 60
  const assessmentName = assessment === 'ca' ? 'CA' : 'Examination'

  // Do not create a result when the teacher leaves a new field blank.
  if (isClearing && !score.resultId) {
    return
  }

  // Validate numeric scores only.
  if (
    !isClearing &&
    !isAbsent &&
    (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > maxScore)
  ) {
    if (assessment === 'ca') {
      score.caScore = score.savedCaScore
    } else {
      score.examScore = score.savedExamScore
    }

    gridSaveErrorMessage.value = `${assessmentName} score must be between 0 and ${maxScore}.`
    return
  }

  gridSaveErrorMessage.value = ''

  const resultData = {
    studentId: Number(student.id),
    subjectId: Number(subjectId),
    academicSessionId: Number(filterSessionId.value),
    termId: Number(filterTermId.value),
  }

  if (assessment === 'ca') {
    resultData.caStatus = isAbsent ? 'ABSENT' : 'PRESENT'
    resultData.caScore = isAbsent ? null : isClearing ? null : numericScore
  } else {
    resultData.examStatus = isAbsent ? 'ABSENT' : 'PRESENT'
    resultData.examScore = isAbsent ? null : isClearing ? null : numericScore
  }

  savingGridCell.value = `${key}-${assessment}`

  try {
    let response

    if (score.resultId) {
      response = await updateResult(score.resultId, resultData)
    } else {
      response = await createResult(resultData)
    }

    score.resultId = response.result?.id ?? score.resultId

    if (assessment === 'ca') {
      score.caScore = formatScore(score.caScore)
      score.savedCaScore = score.caScore
    } else {
      score.examScore = formatScore(score.examScore)
      score.savedExamScore = score.examScore
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

const loadResults = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const filters = {}

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
    classSubjects.value = await getClassSubjects()
    classes.value = await getClasses()

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

watch([filterSessionId, filterTermId, filterClassId], () => {
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
            <option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">
              {{ schoolClass.name }}
            </option>
          </select>
        </div>
      </form>

      <p v-if="isLoadingReferences">Loading reference data...</p>

      <p v-else-if="!isGridReady">Select all three filters to display the result-entry grid.</p>

      <p v-if="gridSaveErrorMessage" class="grid-save-error">
        {{ gridSaveErrorMessage }}
      </p>

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
                    <input
                      v-model="gridScores[`${student.id}-${classSubject.subjectId}`].caScore"
                      type="text"
                      inputmode="decimal"
                      placeholder="Score / -"
                      class="score-input"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}-ca` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                      @blur="saveGridCell(student, classSubject, 'ca')"
                    />
                    <small v-if="savingGridCell === `${student.id}-${classSubject.subjectId}-ca`">
                      Saving...
                    </small>
                  </template>

                  <template v-else>
                    {{ formatScore(gridScores[`${student.id}-${classSubject.subjectId}`].caScore) }}
                  </template>
                </td>

                <td>
                  <template v-if="canEditSubject(classSubject.subjectId)">
                    <input
                      v-model="gridScores[`${student.id}-${classSubject.subjectId}`].examScore"
                      type="text"
                      inputmode="decimal"
                      placeholder="Score / -"
                      class="score-input"
                      :disabled="
                        savingGridCell === `${student.id}-${classSubject.subjectId}-exam` ||
                        gridScores[`${student.id}-${classSubject.subjectId}`].status === 'APPROVED'
                      "
                      @blur="saveGridCell(student, classSubject, 'exam')"
                    />
                    <small v-if="savingGridCell === `${student.id}-${classSubject.subjectId}-exam`">
                      Saving...
                    </small>
                  </template>

                  <template v-else>
                    {{
                      formatScore(gridScores[`${student.id}-${classSubject.subjectId}`].examScore)
                    }}
                  </template>
                </td>
              </template>
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

input {
  padding: 0.5rem;
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

.grid-save-error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0 0 12px;
  font-weight: 500;
}
</style>
