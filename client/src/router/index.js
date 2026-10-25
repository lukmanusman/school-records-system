import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../services/authStorage.js'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import StudentsView from '../views/StudentsView.vue'
import AppLayout from '../layouts/AppLayout.vue'
import EnrollmentView from '../views/EnrollmentView.vue'
import TeachersView from '../views/TeachersView.vue'
import ChangePasswordView from '../views/ChangePasswordView.vue'
import ProfileView from '../views/ProfileView.vue'
import TeacherProfileView from '../views/TeacherProfileView.vue'
import StudentProfileView from '../views/StudentProfileView.vue'
import ClassesView from '../views/ClassesView.vue'
import SubjectsView from '../views/SubjectsView.vue'
import ClassSubjectsView from '../views/ClassSubjectsView.vue'
import TeacherAssignmentsView from '../views/TeacherAssignmentsView.vue'
import ResultsView from '../views/ResultsView.vue'
import ResultPreviewView from '../views/ResultPreviewView.vue'
import StudentResultPreviewView from '../views/StudentResultPreviewView.vue'

const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      component: AppLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
        },
        {
          path: 'students',
          name: 'students',
          component: StudentsView,
        },
        {
          path: 'students/:id',
          name: 'student-profile',
          component: StudentProfileView,
        },
        {
          path: 'teachers',
          name: 'teachers',
          component: TeachersView,
        },
        {
          path: 'enrollments/new',
          name: 'enrollment-new',
          component: EnrollmentView,
        },
        {
          path: 'teachers/:id',
          name: 'teacher-profile',
          component: TeacherProfileView,
        },
        {
          path: 'change-password',
          name: 'change-password',
          component: ChangePasswordView,
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileView,
        },
        {
          path: 'classes',
          name: 'classes',
          component: ClassesView,
        },
        {
          path: 'subjects',
          name: 'subjects',
          component: SubjectsView,
        },
        {
          path: 'class-subjects',
          name: 'class-subjects',
          component: ClassSubjectsView,
        },
        {
          path: 'teacher-assignments',
          name: 'teacher-assignments',
          component: TeacherAssignmentsView,
        },
        { path: 'results/entry', name: 'results-entry', component: ResultsView },
        { path: 'results/preview', name: 'results-preview', component: ResultPreviewView },
        {
          path: 'results/students/:studentId',
          name: 'student-result-preview',
          component: StudentResultPreviewView,
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = getToken()

  if (to.meta.requiresAuth && !token) {
    return {
      name: 'login',
    }
  }

  if (to.name === 'login' && token) {
    return {
      name: 'dashboard',
    }
  }
})

export default router
