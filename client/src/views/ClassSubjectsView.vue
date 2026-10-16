<script setup>
import { onMounted, ref } from 'vue'
import { getClassSubjects, createClassSubject } from '../services/classSubjects.js'
import { getClasses } from '../services/classes.js'
import { getSubjects } from '../services/subjects.js'

const classSubjects = ref([])
const classes = ref([])
const subjects = ref([])

const selectedClassId = ref('')
const selectedSubjectId = ref('')

const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const loadData = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [assignmentsData, classesData, subjectsData] = await Promise.all([
      getClassSubjects(),
      getClasses(),
      getSubjects(),
    ])

    classSubjects.value = assignmentsData
    classes.value = classesData
    subjects.value = subjectsData
  } catch (error) {
    console.error('Error loading class subjects:', error)
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const handleCreateAssignment = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isCreating.value = true

  try {
    const response = await createClassSubject(selectedClassId.value, selectedSubjectId.value)

    successMessage.value = response.message || 'Subject assigned to class successfully.'

    selectedClassId.value = ''
    selectedSubjectId.value = ''

    await loadData()
  } catch (error) {
    console.error('Error assigning subject:', error)
    errorMessage.value = error.message
  } finally {
    isCreating.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <h1>Class Subjects</h1>

    <section>
      <h2>Assign Subject to Class</h2>

      <form @submit.prevent="handleCreateAssignment">
        <label for="classId">Class</label>
        <select id="classId" v-model="selectedClassId" required>
          <option value="" disabled>Select a class</option>
          <option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">
            {{ schoolClass.name }}
          </option>
        </select>

        <label for="subjectId">Subject</label>
        <select id="subjectId" v-model="selectedSubjectId" required>
          <option value="" disabled>Select a subject</option>
          <option v-for="subject in subjects" :key="subject.id" :value="subject.id">
            {{ subject.name }}
          </option>
        </select>

        <button type="submit" :disabled="isCreating || !selectedClassId || !selectedSubjectId">
          {{ isCreating ? 'Assigning...' : 'Assign Subject' }}
        </button>
      </form>

      <p v-if="successMessage">{{ successMessage }}</p>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <section>
      <h2>Existing Assignments</h2>

      <p v-if="isLoading">Loading class subjects...</p>

      <p v-else-if="classSubjects.length === 0">No class-subject assignments found.</p>

      <div v-else>
        <p>Total assignments: {{ classSubjects.length }}</p>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Class</th>
              <th>Subject</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="assignment in classSubjects" :key="assignment.id">
              <td>{{ assignment.id }}</td>
              <td>{{ assignment.class?.name ?? assignment.classId }}</td>
              <td>{{ assignment.subject?.name ?? assignment.subjectId }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
section {
  margin-bottom: 2rem;
}

form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
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
  border-bottom: 1px solid #ddd;
}
</style>
