<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

import { getResults } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getClassSubjects } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'

const route = useRoute()
const router = useRouter()

const { user } = useAuth()

const isStudent = computed(() => user.value?.role === 'STUDENT')

const isStaff = computed(() => ['ADMIN', 'TEACHER'].includes(user.value?.role))

const studentId = route.query.studentId
const academicSessionId = route.query.academicSessionId
const termId = route.query.termId
const classId = route.query.classId

const isIndividualPreview = computed(() => isStaff.value && !!studentId)

const results = ref([])
const students = ref([])
const classSubjects = ref([])
const classes = ref([])
const academicSessions = ref([])
const terms = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const selectedStudent = computed(() =>
  students.value.find((student) => Number(student.id) === Number(studentId)),
)

const selectedClass = computed(() =>
  classes.value.find((schoolClass) => Number(schoolClass.id) === Number(classId)),
)

const selectedSession = computed(() =>
  academicSessions.value.find((session) => Number(session.id) === Number(academicSessionId)),
)

const selectedTerm = computed(() => terms.value.find((term) => Number(term.id) === Number(termId)))

const subjectsForSelectedClass = computed(() =>
  classSubjects.value.filter((classSubject) => Number(classSubject.classId) === Number(classId)),
)

const resultsLookup = computed(() => {
  const lookup = new Map()

  results.value.forEach((result) => {
    lookup.set(Number(result.subjectId), result)
  })

  return lookup
})

const getResultForSubject = (subjectId) => {
  return resultsLookup.value.get(Number(subjectId)) || null
}

const isAssessmentComplete = (status, score) => {
  return status === 'ABSENT' || (score !== null && score !== undefined)
}

const getDisplayScore = (result, assessment) => {
  if (!result) return '-'

  const status = result[`${assessment}Status`]
  const score = result[`${assessment}Score`]

  if (status === 'ABSENT') return '-'

  if (score === null || score === undefined) return 'Pending'

  return String(score).padStart(2, '0')
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

const goBackToClassPreview = () => {
  router.push({
    name: 'results-preview',
    query: {
      academicSessionId,
      termId,
      classId,
    },
  })
}

const getStudentName = (student) => {
  if (!student) return ''

  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

const loadResults = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    if (isIndividualPreview.value) {
      const resultData = await getResults({
        studentId,
        academicSessionId,
        termId,
        classId,
      })

      await loadIndividualPreviewData()

      results.value = resultData
    } else {
      // The backend identifies the logged-in student.
      results.value = await getResults()
    }
  } catch (error) {
    console.error('Error loading student results:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const loadIndividualPreviewData = async () => {
  const [studentData, classSubjectData, classData, sessionData, termData] = await Promise.all([
    getStudents(academicSessionId, termId),
    getClassSubjects(),
    getClasses(),
    getAcademicSessions(),
    getTerms(academicSessionId),
  ])

  students.value = studentData
  classSubjects.value = classSubjectData
  classes.value = classData
  academicSessions.value = sessionData
  terms.value = termData
}

onMounted(loadResults)
</script>

<template>
  <section>
    <p v-if="isLoading">Loading results...</p>

    <p v-else-if="errorMessage">
      {{ errorMessage }}
    </p>

    <template v-else-if="isIndividualPreview">
      <button type="button" @click="goBackToClassPreview">← Back to Class Result Preview</button>

      <h1>Student Result Preview</h1>

      <template v-if="selectedStudent">
        <div class="student-details">
          <h2>{{ getStudentName(selectedStudent) }}</h2>

          <p>
            Admission Number:
            {{ selectedStudent.admissionNumber }}
          </p>

          <p>Class: {{ selectedClass?.name ?? '—' }}</p>

          <p>Academic Session: {{ selectedSession?.name ?? '—' }}</p>

          <p>Term: {{ selectedTerm?.name ?? '—' }}</p>
        </div>

        <div class="table-wrapper">
          <table class="result-table">
            <thead>
              <tr>
                <th>S/N</th>
                <th>Subject</th>
                <th>CA (40)</th>
                <th>Exam (60)</th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(classSubject, index) in subjectsForSelectedClass" :key="classSubject.id">
                <td>{{ index + 1 }}</td>

                <td>{{ classSubject.subject.name }}</td>

                <td>
                  {{ getDisplayScore(getResultForSubject(classSubject.subjectId), 'ca') }}
                </td>

                <td>
                  {{ getDisplayScore(getResultForSubject(classSubject.subjectId), 'exam') }}
                </td>

                <td>
                  {{ getDisplayTotal(getResultForSubject(classSubject.subjectId)) }}
                </td>

                <td>
                  {{ getDisplayGrade(getResultForSubject(classSubject.subjectId)) }}
                </td>
              </tr>

              <tr v-if="subjectsForSelectedClass.length === 0">
                <td colspan="6">No subjects found for this class.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p v-else>Student information could not be found.</p>
    </template>

    <template v-else>
      <h1>My Results</h1>

      <p v-if="results.length === 0">No published results are available yet.</p>

      <table v-else>
        <thead>
          <tr>
            <th>Academic Session</th>
            <th>Term</th>
            <th>Class</th>
            <th>Subject</th>
            <th>CA</th>
            <th>Exam</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="result in results" :key="result.id">
            <td>{{ result.academicSession.name }}</td>
            <td>{{ result.term.name }}</td>
            <td>{{ result.class?.name ?? '—' }}</td>
            <td>{{ result.subject.name }}</td>
            <td>
              {{ result.caStatus === 'ABSENT' ? 'ABS' : result.caScore }}
            </td>
            <td>
              {{ result.examStatus === 'ABSENT' ? 'ABS' : result.examScore }}
            </td>
            <td>{{ result.totalScore }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>
