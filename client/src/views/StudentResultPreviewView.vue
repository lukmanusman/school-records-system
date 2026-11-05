<script setup>
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

import { getResults } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getClassSubjects } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'
import { getClassResultSheet } from '../services/classResultSheet.js'
import { checkMyFormTeacherAssignment } from '../services/formTeacherAssignment.js'

const route = useRoute()
const router = useRouter()

const { user } = useAuth()

const isStudent = computed(() => user.value?.role === 'STUDENT')
const isStaff = computed(() => ['ADMIN', 'TEACHER'].includes(user.value?.role))
const isAdmin = computed(() => user.value?.role === 'ADMIN')

const studentId = route.query.studentId
const academicSessionId = route.query.academicSessionId
const termId = route.query.termId
const classId = route.query.classId

const isIndividualPreview = computed(() => isStaff.value && !!studentId)

const results = ref([])
const classResultSheet = ref(null)
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

const isResultApproved = computed(() => classResultSheet.value?.status === 'APPROVED')

const isFormTeacher = ref(false)

const canDownloadPDF = computed(
  () => isResultApproved.value && (isAdmin.value || isFormTeacher.value),
)

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

const aggregateTotal = computed(() => {
  if (subjectsForSelectedClass.value.length === 0) {
    return '-'
  }

  let total = 0

  for (const classSubject of subjectsForSelectedClass.value) {
    const result = getResultForSubject(classSubject.subjectId)
    const subjectTotal = getDisplayTotal(result)

    if (subjectTotal === 'Pending') {
      return 'Pending'
    }

    if (typeof subjectTotal === 'number') {
      total += subjectTotal
    }
  }

  return total
})

const downloadResultPDF = () => {
  const doc = new jsPDF()

  // School heading
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SCHOOL NAME', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('School Address and Contact Details', 105, 27, {
    align: 'center',
  })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('STUDENT ACADEMIC REPORT', 105, 40, {
    align: 'center',
  })

  // Student information
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  doc.text(`Student Name: ${getStudentName(selectedStudent.value)}`, 14, 55)
  doc.text(`Admission Number: ${selectedStudent.value.admissionNumber}`, 14, 62)
  doc.text(`Class: ${selectedClass.value?.name ?? '—'}`, 14, 69)
  doc.text(`Academic Session: ${selectedSession.value?.name ?? '—'}`, 120, 55)
  doc.text(`Term: ${selectedTerm.value?.name ?? '—'}`, 120, 62)

  // Subject results
  const tableRows = subjectsForSelectedClass.value.map((classSubject, index) => {
    const result = getResultForSubject(classSubject.subjectId)

    return [
      index + 1,
      classSubject.subject.name,
      getDisplayScore(result, 'ca'),
      getDisplayScore(result, 'exam'),
      getDisplayTotal(result),
      getDisplayGrade(result),
    ]
  })

  autoTable(doc, {
    startY: 80,
    head: [['S/N', 'Subject', 'CA (40)', 'Exam (60)', 'Total', 'Grade']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
    },
  })

  // Aggregate total
  const finalY = doc.lastAutoTable.finalY + 10

  doc.setFont('helvetica', 'bold')
  doc.text(`Aggregate Total: ${aggregateTotal.value}`, 196, finalY, { align: 'right' })

  // Signature sections
  doc.setFont('helvetica', 'normal')

  doc.line(20, finalY + 35, 85, finalY + 35)
  doc.text("Class Teacher's Signature", 20, finalY + 41)

  doc.line(125, finalY + 35, 190, finalY + 35)
  doc.text("Principal's Signature", 125, finalY + 41)

  // Download PDF
  const fileName = `${selectedStudent.value.admissionNumber}-result.pdf`

  doc.save(fileName)
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
  isFormTeacher.value = false

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
      try {
        classResultSheet.value = await getClassResultSheet({
          classId,
          academicSessionId,
          termId,
        })
      } catch (error) {
        if (error.message === 'Class result sheet not found') {
          classResultSheet.value = null
        } else {
          throw error
        }
      }
      if (user.value?.role === 'TEACHER' && classResultSheet.value?.status === 'APPROVED') {
        try {
          const assignment = await checkMyFormTeacherAssignment({
            classId,
            academicSessionId,
          })

          isFormTeacher.value = assignment.isFormTeacher
        } catch (error) {
          console.error('Error checking form teacher assignment:', error)
          isFormTeacher.value = false
        }
      }
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
      <div class="preview-actions">
        <button type="button" @click="goBackToClassPreview">← Back to Class Result Preview</button>

        <button
          v-if="canDownloadPDF"
          type="button"
          class="download-button"
          @click="downloadResultPDF"
          :disabled="!selectedStudent || subjectsForSelectedClass.length === 0"
        >
          Download PDF
        </button>

        <p v-else class="approval-message">PDF download will be available after Admin approval.</p>
      </div>

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

            <tfoot>
              <tr>
                <td colspan="4" class="aggregate-label">Aggregate Total</td>

                <td class="aggregate-value">
                  {{ aggregateTotal }}
                </td>

                <td></td>
              </tr>
            </tfoot>
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

<style scoped>
.student-details {
  margin: 24px 0;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
}

.student-details h2 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.student-details p {
  margin: 8px 0;
  color: #374151;
  font-size: 14px;
}

.preview-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.download-button {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  background-color: #2563eb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.download-button:hover {
  background-color: #1d4ed8;
}

.download-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin-top: 20px;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.result-table th,
.result-table td {
  border: 1px solid #d1d5db;
  padding: 12px 14px;
  text-align: center;
}

.result-table th {
  background-color: #f3f4f6;
  font-weight: 600;
  color: #111827;
}

.result-table tbody tr:nth-child(even) {
  background-color: #f9fafb;
}

.result-table tbody td:nth-child(2) {
  text-align: left;
  min-width: 180px;
}

.result-table tbody tr:hover {
  background-color: #f3f4f6;
}

.result-table tfoot td {
  padding: 14px;
  font-weight: 700;
  background-color: #e5e7eb;
  border: 1px solid #d1d5db;
}

.aggregate-label {
  text-align: right;
}

.aggregate-value {
  text-align: center;
  font-size: 16px;
}

.approval-message {
  color: #b45309;
  font-size: 14px;
  font-weight: 500;
}
</style>
