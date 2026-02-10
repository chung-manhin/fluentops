import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
    { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
    { path: '/register', name: 'register', component: () => import('../pages/RegisterPage.vue') },
    { path: '/dashboard', name: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta: { requiresAuth: true } },
    { path: '/speaking', name: 'speaking', component: () => import('../pages/SpeakingPage.vue'), meta: { requiresAuth: true } },
    { path: '/coach', name: 'coach', component: () => import('../pages/CoachPage.vue'), meta: { requiresAuth: true } },
    { path: '/billing', name: 'billing', component: () => import('../pages/BillingPage.vue'), meta: { requiresAuth: true } },
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
