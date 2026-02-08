import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import SpeakingPage from '../pages/SpeakingPage.vue';
import CoachPage from '../pages/CoachPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/register', name: 'register', component: RegisterPage },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/speaking', name: 'speaking', component: SpeakingPage, meta: { requiresAuth: true } },
    { path: '/coach', name: 'coach', component: CoachPage, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('accessToken');
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else {
    next();
  }
});
