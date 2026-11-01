<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { getResults } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getClassSubjects } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'

const route = useRoute()

const academicSessionId = route.query.academicSessionId
const termId = route.query.termId
const classId = route.query.classId

const results = ref([])
const students = ref([])
const classSubjects = ref([])
const classes = ref([])
const academicSessions = ref([])
const terms = ref([])

const isLoading = ref(false)
const errorMessage = ref('')

const selectedSession = computed(() =>
  academicSessions.value.find((session) => Number(session.id) === Number(academicSessionId)),
)

const selectedTerm = computed(() => terms.value.find((term) => Number(term.id) === Number(termId)))

const selectedClass = computed(() =>
  classes.value.find((schoolClass) => Number(schoolClass.id) === Number(classId)),
)

const subjectsForSelectedClass = computed(() =>
  classSubjects.value.filter((classSubject) => Number(classSubject.classId) === Number(classId)),
)

const studentsForSelectedClass = computed(() =>
  students.value.filter((student) => Number(student.classId) === Number(classId)),
)

const resultsLookup = computed(() => {
  const lookup = new Map()

  results.value.forEach((result) => {
    lookup.set(`${result.studentId}-${result.subjectId}`, result)
  })

  return lookup
})

const getResultForCell = (studentId, subjectId) => {
  return resultsLookup.value.get(`${studentId}-${subjectId}`) || null
}

const isAssessmentComplete = (status, score) => {
  return status === 'ABSENT' || (score !== null && score !== undefined)
}

const getDisplayTotal = (result) => {
  if (!result) return 'Pending'

  const caAbsent = result.caStatus === 'ABSENT'
  const examAbsent = result.examStatus === 'ABSENT'

  if (caAbsent && examAbsent) return '-'

  const caComplete = isAssessmentComplete(result.caStatus, result.caScore)

  const examComplete = isAssessmentComplete(result.examStatus, result.examScore)

  if (!caComplete || !examComplete) return 'Pending'

  return result.totalScore
}

const getGrade = (total) => {
  if (typeof total !== 'number') return ''

  if (total >= 70) return 'A'
  if (total >= 60) return 'B'
  if (total >= 50) return 'C'
  if (total >= 45) return 'D'
  if (total >= 40) return 'E'

  return 'F'
}

const getDisplayGrade = (result) => {
  const total = getDisplayTotal(result)

  if (total === 'Pending') return 'Pending'
  if (total === '-') return 'F'

  return getGrade(total)
}

const getDisplayScore = (result, assessment) => {
  if (!result) return '-'

  const status = result[`${assessment}Status`]
  const score = result[`${assessment}Score`]

  if (status === 'ABSENT') return '-'

  if (score === null || score === undefined) return 'Pending'

  return String(score).padStart(2, '0')
}

const getStudentName = (student) => {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

const loadPreviewData = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [resultData, studentData, classSubjectData, classData, sessionData, termData] =
      await Promise.all([
        getResults({
          academicSessionId,
          termId,
          classId,
        }),
        getStudents(academicSessionId, termId),
        getClassSubjects(),
        getClasses(),
        getAcademicSessions(),
        getTerms(academicSessionId),
      ])

    results.value = resultData
    students.value = studentData
    classSubjects.value = classSubjectData
    classes.value = classData
    academicSessions.value = sessionData
    terms.value = termData
    console.log('Preview results:', results.value)
    console.log('Preview students:', students.value)
    console.log('Preview class subjects:', classSubjects.value)
    console.log('Preview classes:', classes.value)
    console.log('Preview sessions:', academicSessions.value)
    console.log('Preview terms:', terms.value)
  } catch (error) {
    console.error('Error loading result preview:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadPreviewData()
})
</script>

<template>
  <main class="result-preview">
    <h1>Class Result Preview</h1>

    <p v-if="isLoading">Loading result preview...</p>

    <p v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <template v-else>
      <section class="preview-header">
        <h2>{{ selectedClass?.name }}</h2>

        <p>Academic Session: {{ selectedSession?.name }}</p>

        <p>Term: {{ selectedTerm?.name }}</p>
      </section>

      <div class="table-wrapper">
        <table class="result-table">
          <thead>
            <tr>
              <th rowspan="2">S/N</th>
              <th rowspan="2">Student Name</th>

              <th
                v-for="classSubject in subjectsForSelectedClass"
                :key="classSubject.id"
                colspan="4"
              >
                {{ classSubject.subject.name }}
              </th>
            </tr>

            <tr>
              <template v-for="classSubject in subjectsForSelectedClass" :key="classSubject.id">
                <th>CA (40)</th>
                <th>Exam (60)</th>
                <th>Total</th>
                <th>Grade</th>
              </template>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(student, index) in studentsForSelectedClass" :key="student.id">
              <td>{{ index + 1 }}</td>
              <td>{{ getStudentName(student) }}</td>

              <template v-for="classSubject in subjectsForSelectedClass" :key="classSubject.id">
                <td>
                  {{ getDisplayScore(getResultForCell(student.id, classSubject.subjectId), 'ca') }}
                </td>

                <td>
                  {{
                    getDisplayScore(getResultForCell(student.id, classSubject.subjectId), 'exam')
                  }}
                </td>

                <td>
                  {{ getDisplayTotal(getResultForCell(student.id, classSubject.subjectId)) }}
                </td>

                <td>
                  {{ getDisplayGrade(getResultForCell(student.id, classSubject.subjectId)) }}
                </td>
              </template>
            </tr>

            <tr v-if="studentsForSelectedClass.length === 0">
              <td :colspan="2 + subjectsForSelectedClass.length * 4">
                No students found in this class.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>

<style scoped>
.result-preview {
  width: 100%;
}

.preview-header {
  margin-bottom: 20px;
}

.preview-header h2 {
  margin-bottom: 8px;
}

.preview-header p {
  margin: 4px 0;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.result-table {
  width: 100%;
  min-width: max-content;
  border-collapse: collapse;
  white-space: nowrap;
}

.result-table th,
.result-table td {
  border: 1px solid #d1d5db;
  padding: 10px 12px;
  text-align: center;
}

.result-table th {
  background-color: #f3f4f6;
  font-weight: 600;
}

.result-table td:nth-child(2) {
  text-align: left;
}

/* Sticky header rows */
.result-table thead tr:first-child th {
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: #f3f4f6;
}

.result-table thead tr:nth-child(2) th {
  position: sticky;
  top: 42px;
  z-index: 5;
  background-color: #f3f4f6;
}

/* Sticky S/N column */
.result-table th:first-child,
.result-table td:first-child {
  position: sticky;
  left: 0;
  min-width: 55px;
  background-color: #fff;
  z-index: 10;
}

/* Sticky Student Name column */
.result-table th:nth-child(2),
.result-table td:nth-child(2) {
  position: sticky;
  left: 55px;
  min-width: 180px;
  background-color: #fff;
  z-index: 10;
}

/* Sticky header intersections */
.result-table thead tr:first-child th:first-child,
.result-table thead tr:first-child th:nth-child(2) {
  z-index: 20;
  background-color: #f3f4f6;
}

.error-message {
  color: #b91c1c;
}
</style>
