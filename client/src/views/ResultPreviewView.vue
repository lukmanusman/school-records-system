<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { getResults } from '../services/results.js'
import { getStudents } from '../services/students.js'
import { getClassSubjects } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getAcademicSessions } from '../services/academicSessions.js'
import { getTerms } from '../services/terms.js'
import {
  getClassResultSheet,
  submitClassResultSheet,
  approveClassResultSheet,
  returnClassResultSheet,
} from '../services/classResultSheets.js'

import { checkMyFormTeacherAssignment } from '../services/formTeacherAssignment.js'
import { useAuth } from '../composables/useAuth.js'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const openStudentPreview = (student) => {
  router.push({
    name: 'student-result-preview',
    query: {
      studentId: student.id,
      academicSessionId: academicSessionId.value,
      termId: termId.value,
      classId: classId.value,
    },
  })
}

const academicSessionId = ref(route.query.academicSessionId ?? '')
const termId = ref(route.query.termId ?? '')
const classId = ref(route.query.classId ?? '')

const results = ref([])
const students = ref([])
const classResultSheet = ref(null)
// Class result sheet workflow
const isFormTeacher = ref(false)
const isCheckingFormTeacherAssignment = ref(false)

const isProcessingSheet = ref(false)
const showReturnForm = ref(false)
const returnReason = ref('')

const workflowError = ref('')
const workflowSuccess = ref('')

// User permissions
const isAdmin = computed(() => user.value?.role === 'ADMIN')
const isTeacher = computed(() => user.value?.role === 'TEACHER')
const classSubjects = ref([])
const classes = ref([])
const academicSessions = ref([])
const terms = ref([])

const isLoading = ref(false)
const errorMessage = ref('')
const hasLoadedPreview = ref(false)

const checkFormTeacherPermission = async () => {
  isFormTeacher.value = false

  if (user.value?.role !== 'TEACHER' || !classId.value || !academicSessionId.value) {
    return
  }

  isCheckingFormTeacherAssignment.value = true

  try {
    const data = await checkMyFormTeacherAssignment({
      classId: classId.value,
      academicSessionId: academicSessionId.value,
    })

    isFormTeacher.value = data.isFormTeacher === true
  } catch (error) {
    console.error('Failed to check form teacher assignment:', error)
    isFormTeacher.value = false
  } finally {
    isCheckingFormTeacherAssignment.value = false
  }
}

const handleSubmitClassResultSheet = async () => {
  workflowError.value = ''
  workflowSuccess.value = ''

  if (!isFormTeacher.value) {
    workflowError.value = 'Only the assigned Form Teacher can submit this class result sheet.'
    return
  }

  if (!['DRAFT', 'RETURNED'].includes(classResultSheet.value?.status)) {
    workflowError.value = 'This class result sheet cannot be submitted in its current status.'
    return
  }

  isProcessingSheet.value = true

  try {
    await submitClassResultSheet({
      classId: Number(classId.value),
      academicSessionId: Number(academicSessionId.value),
      termId: Number(termId.value),
    })
    await loadPreviewData()
    workflowSuccess.value = 'Class result sheet submitted successfully.'
  } catch (error) {
    workflowError.value = error.message
  } finally {
    isProcessingSheet.value = false
  }
}

const handleApproveClassResultSheet = async () => {
  workflowError.value = ''
  workflowSuccess.value = ''

  if (!isAdmin.value) {
    workflowError.value = 'Only an Admin can approve a class result sheet.'
    return
  }

  if (classResultSheet.value?.status !== 'SUBMITTED') {
    workflowError.value = 'Only submitted class result sheets can be approved.'
    return
  }

  isProcessingSheet.value = true

  try {
    await approveClassResultSheet(classResultSheet.value.id)

    await loadPreviewData()

    workflowSuccess.value = 'Class result sheet approved successfully.'
  } catch (error) {
    workflowError.value = error.message
  } finally {
    isProcessingSheet.value = false
  }
}

const handleReturnClassResultSheet = async () => {
  workflowError.value = ''
  workflowSuccess.value = ''

  if (!isAdmin.value) {
    workflowError.value = 'Only an Admin can return a class result sheet.'
    return
  }

  if (classResultSheet.value?.status !== 'SUBMITTED') {
    workflowError.value = 'Only submitted class result sheets can be returned.'
    return
  }

  if (!returnReason.value.trim()) {
    workflowError.value = 'Please provide a reason for returning this result sheet.'
    return
  }

  isProcessingSheet.value = true

  try {
    await returnClassResultSheet(classResultSheet.value.id, returnReason.value.trim())

    showReturnForm.value = false
    returnReason.value = ''

    await loadPreviewData()

    workflowSuccess.value = 'Class result sheet returned successfully.'
  } catch (error) {
    workflowError.value = error.message
  } finally {
    isProcessingSheet.value = false
  }
}

const selectedSession = computed(() =>
  academicSessions.value.find((session) => Number(session.id) === Number(academicSessionId.value)),
)

const selectedTerm = computed(() =>
  terms.value.find((term) => Number(term.id) === Number(termId.value)),
)

const selectedClass = computed(() =>
  classes.value.find((schoolClass) => Number(schoolClass.id) === Number(classId.value)),
)

const subjectsForSelectedClass = computed(() =>
  classSubjects.value.filter(
    (classSubject) => Number(classSubject.classId) === Number(classId.value),
  ),
)

const studentsForSelectedClass = computed(() =>
  students.value.filter((student) => Number(student.classId) === Number(classId.value)),
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

const loadFilterOptions = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [sessionData, classData, classSubjectData] = await Promise.all([
      getAcademicSessions(),
      getClasses(),
      getClassSubjects(),
    ])

    academicSessions.value = sessionData
    classes.value = classData
    classSubjects.value = classSubjectData

    if (academicSessionId.value) {
      terms.value = await getTerms(academicSessionId.value)
    }
  } catch (error) {
    console.error('Error loading preview filters:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const loadPreviewData = async () => {
  if (!academicSessionId.value || !termId.value || !classId.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  workflowError.value = ''
  workflowSuccess.value = ''
  showReturnForm.value = false
  returnReason.value = ''

  try {
    const [resultData, studentData, sheetData] = await Promise.all([
      getResults({
        academicSessionId: academicSessionId.value,
        termId: termId.value,
        classId: classId.value,
      }),
      getStudents(academicSessionId.value, termId.value),
      getClassResultSheet({
        academicSessionId: academicSessionId.value,
        termId: termId.value,
        classId: classId.value,
      }),
    ])

    results.value = resultData
    students.value = studentData
    classResultSheet.value = sheetData ?? { status: 'DRAFT' }
    hasLoadedPreview.value = true
    await checkFormTeacherPermission()
  } catch (error) {
    console.error('Error loading result preview:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const handleAcademicSessionChange = async () => {
  termId.value = ''
  terms.value = []
  results.value = []
  students.value = []
  classResultSheet.value = null
  hasLoadedPreview.value = false

  if (!academicSessionId.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    terms.value = await getTerms(academicSessionId.value)
  } catch (error) {
    console.error('Error loading terms:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const clearPreviewData = () => {
  results.value = []
  students.value = []
  hasLoadedPreview.value = false
  classResultSheet.value = null
}

onMounted(async () => {
  await loadFilterOptions()

  if (academicSessionId.value && termId.value && classId.value) {
    await loadPreviewData()
  }
})
</script>

<template>
  <main class="result-preview">
    <h1>Class Result Preview</h1>

    <section class="preview-filters">
      <div class="filter-group">
        <label for="academic-session">Academic Session</label>
        <select
          id="academic-session"
          v-model="academicSessionId"
          @change="handleAcademicSessionChange"
        >
          <option value="">Select Academic Session</option>
          <option v-for="session in academicSessions" :key="session.id" :value="String(session.id)">
            {{ session.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="term">Term</label>
        <select
          id="term"
          v-model="termId"
          @change="clearPreviewData"
          :disabled="!academicSessionId"
        >
          <option value="">Select Term</option>
          <option v-for="term in terms" :key="term.id" :value="String(term.id)">
            {{ term.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="school-class">Class</label>
        <select id="school-class" v-model="classId" @change="clearPreviewData">
          <option value="">Select Class</option>
          <option
            v-for="schoolClass in classes"
            :key="schoolClass.id"
            :value="String(schoolClass.id)"
          >
            {{ schoolClass.name }}
          </option>
        </select>
      </div>

      <button
        type="button"
        class="preview-button"
        @click="loadPreviewData"
        :disabled="!academicSessionId || !termId || !classId || isLoading"
      >
        Preview Results
      </button>
    </section>

    <p v-if="isLoading">Loading result preview...</p>

    <p v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <template v-else-if="hasLoadedPreview">
      <section class="preview-header">
        <h2>{{ selectedClass?.name }}</h2>

        <p>Academic Session: {{ selectedSession?.name }}</p>

        <p>Term: {{ selectedTerm?.name }}</p>
        <p v-if="classResultSheet">
          Result Status: <strong>{{ classResultSheet.status }}</strong>
        </p>
        <div
          v-if="classResultSheet?.status === 'RETURNED' && classResultSheet?.returnReason"
          class="return-reason-message"
        >
          <strong>Admin's Return Message:</strong>
          <p>{{ classResultSheet.returnReason }}</p>
        </div>
      </section>

      <section class="sheet-workflow">
        <p v-if="workflowError" class="error-message">
          {{ workflowError }}
        </p>

        <p v-if="workflowSuccess" class="success-message">
          {{ workflowSuccess }}
        </p>

        <!-- Form Teacher submission -->
        <button
          v-if="
            isTeacher && isFormTeacher && ['DRAFT', 'RETURNED'].includes(classResultSheet?.status)
          "
          type="button"
          class="workflow-button"
          @click="handleSubmitClassResultSheet"
          :disabled="isProcessingSheet || isCheckingFormTeacherAssignment"
        >
          {{ isProcessingSheet ? 'Submitting...' : 'Submit Result Sheet' }}
        </button>

        <!-- Admin approval and return -->
        <template v-if="isAdmin && classResultSheet?.status === 'SUBMITTED'">
          <button
            type="button"
            class="workflow-button"
            @click="handleApproveClassResultSheet"
            :disabled="isProcessingSheet"
          >
            {{ isProcessingSheet ? 'Processing...' : 'Approve Result Sheet' }}
          </button>

          <button
            v-if="!showReturnForm"
            type="button"
            class="workflow-button return-button"
            @click="showReturnForm = true"
            :disabled="isProcessingSheet"
          >
            Return Result Sheet
          </button>

          <div v-if="showReturnForm" class="return-form">
            <label for="return-reason">Reason for returning result sheet</label>

            <textarea
              id="return-reason"
              v-model="returnReason"
              rows="3"
              placeholder="Enter the reason for returning this result sheet"
            ></textarea>

            <button
              type="button"
              class="workflow-button return-button"
              @click="handleReturnClassResultSheet"
              :disabled="isProcessingSheet || !returnReason.trim()"
            >
              {{ isProcessingSheet ? 'Returning...' : 'Confirm Return' }}
            </button>

            <button
              type="button"
              class="workflow-button cancel-button"
              @click="showReturnForm = false"
              :disabled="isProcessingSheet"
            >
              Cancel
            </button>
          </div>
        </template>
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
              <td>
                <button
                  type="button"
                  class="student-name-link"
                  @click="openStudentPreview(student)"
                >
                  {{ getStudentName(student) }}
                </button>
              </td>
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

.preview-filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 600;
}

.filter-group select {
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background-color: #fff;
}

.preview-button {
  padding: 10px 18px;
  border: none;
  border-radius: 5px;
  background-color: #2563eb;
  color: #fff;
  cursor: pointer;
}

.preview-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
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

.student-name-link {
  border: none;
  padding: 0;
  background: none;
  color: #2563eb;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.student-name-link:hover {
  text-decoration: underline;
}

.error-message {
  color: #b91c1c;
}

.sheet-workflow {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.workflow-button {
  padding: 10px 16px;
  border: none;
  border-radius: 5px;
  background-color: #2563eb;
  color: #fff;
  cursor: pointer;
}

.workflow-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.return-button {
  background-color: #b45309;
}

.cancel-button {
  background-color: #6b7280;
}

.success-message {
  width: 100%;
  color: #15803d;
}

.sheet-workflow .error-message {
  width: 100%;
}

.return-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 450px;
}

.return-form label {
  font-size: 14px;
  font-weight: 600;
}

.return-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  font: inherit;
  resize: vertical;
}

.return-reason-message {
  margin-top: 12px;
  padding: 12px;
  border-left: 4px solid #b45309;
  background-color: #fffbeb;
  color: #92400e;
}

.return-reason-message p {
  margin: 6px 0 0;
}
</style>
