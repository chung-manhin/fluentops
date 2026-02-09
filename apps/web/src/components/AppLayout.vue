<template>
  <!-- Mobile top bar -->
  <div class="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-white border-b px-4 py-3 md:hidden">
    <span class="font-semibold text-indigo-600">FluentOps</span>
    <button class="p-1" @click="sidebarOpen = !sidebarOpen">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>

  <!-- Mobile overlay -->
  <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-black/30 md:hidden" @click="sidebarOpen = false" />

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed top-0 left-0 z-50 flex h-full w-56 flex-col bg-white border-r transition-transform duration-200',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
  >
    <div class="px-5 py-5 text-lg font-bold text-indigo-600">FluentOps</div>
    <nav class="flex-1 space-y-1 px-3">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          $route.path === item.to
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-slate-600 hover:bg-slate-50',
        ]"
        @click="sidebarOpen = false"
      >
        {{ item.label }}
      </router-link>
    </nav>
    <div class="border-t px-4 py-4">
      <p class="truncate text-sm text-slate-500">{{ authStore.user?.email }}</p>
      <button class="mt-2 text-sm text-red-500 hover:text-red-700" @click="handleLogout">Logout</button>
    </div>
  </aside>

  <!-- Main content -->
  <div class="min-h-screen bg-slate-50 md:pl-56">
    <div class="pt-14 md:pt-0">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const sidebarOpen = ref(false);

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/speaking', label: 'Speaking' },
  { to: '/coach', label: 'AI Coach' },
  { to: '/billing', label: 'Billing' },
];

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>
