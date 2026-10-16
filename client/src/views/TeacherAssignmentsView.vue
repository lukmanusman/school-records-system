<script setup>
import { onMounted, ref } from 'vue'
import { getTeacherAssignments, createTeacherAssignment } from '../services/teacherAssignments.js'
import { getTeachers } from '../services/teachers.js'
import { getClasses } from '../services/classes.js'
import { getSubjects } from '../services/subjects.js'

const assignments = ref([])
const teachers = ref([])
const classes = ref([])
const subjects = ref([])

const selectedTeacherId = ref('')
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
    const [assignmentsData, teachersData, classesData, subjectsData] = await Promise.all([
      getTeacherAssignments(),
      getTeachers(),
      getClasses(),
      getSubjects(),
    ])

    assignments.value = assignmentsData
    teachers.value = teachersData
    classes.value = classesData
    subjects.value = subjectsData
  } catch (error) {
    console.error('Error loading teacher assignments:', error)
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
    const response = await createTeacherAssignment(
      selectedTeacherId.value,
      selectedSubjectId.value,
      selectedClassId.value,
    )

    successMessage.value = response.message || 'Teacher assigned successfully.'

    selectedTeacherId.value = ''
    selectedClassId.value = ''
    selectedSubjectId.value = ''

    await loadData()
  } catch (error) {
    console.error('Error creating teacher assignment:', error)
    errorMessage.value = error.message
  } finally {
    isCreating.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <h1>Teacher Assignments</h1>

    <section>
      <h2>Assign Teacher to Subject and Class</h2>

      <form @submit.prevent="handleCreateAssignment">
        <label for="teacherId">Teacher</label>
        <select id="teacherId" v-model="selectedTeacherId" required>
          <option value="" disabled>Select a teacher</option>
          <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
            {{ teacher.firstName }} {{ teacher.surname }}
          </option>
        </select>

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

        <button
          type="submit"
          :disabled="isCreating || !selectedTeacherId || !selectedClassId || !selectedSubjectId"
        >
          {{ isCreating ? 'Assigning...' : 'Assign Teacher' }}
        </button>
      </form>

      <p v-if="successMessage">{{ successMessage }}</p>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <section>
      <h2>Existing Assignments</h2>

      <p v-if="isLoading">Loading teacher assignments...</p>

      <p v-else-if="assignments.length === 0">No teacher assignments found.</p>

      <div v-else>
        <p>Total assignments: {{ assignments.length }}</p>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Teacher</th>
              <th>Class</th>
              <th>Subject</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="assignment in assignments" :key="assignment.id">
              <td>{{ assignment.id }}</td>
              <td>
                {{ assignment.teacher.firstName }}
                {{ assignment.teacher.surname }}
              </td>
              <td>{{ assignment.class.name }}</td>
              <td>{{ assignment.subject.name }}</td>
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
