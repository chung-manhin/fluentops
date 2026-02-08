<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b bg-white">
      <div class="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
        <h1 class="text-lg font-semibold">FluentOps Dashboard</h1>
        <el-button @click="handleLogout" :loading="loggingOut">Logout</el-button>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-6 py-10">
      <el-card v-if="authStore.user">
        <template #header>
          <h2 class="text-lg font-medium">User Info</h2>
        </template>
        <div class="space-y-2">
          <p><span class="font-medium">ID:</span> {{ authStore.user.id }}</p>
          <p><span class="font-medium">Email:</span> {{ authStore.user.email }}</p>
        </div>
      </el-card>

      <el-card v-else class="mt-4">
        <el-skeleton :rows="3" animated />
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const loggingOut = ref(false);

onMounted(async () => {
  if (!authStore.user && authStore.isAuthenticated) {
    try {
      await authStore.fetchUser();
    } catch {
      router.push('/login');
    }
  }
});

async function handleLogout() {
  loggingOut.value = true;
  await authStore.logout();
  router.push('/login');
}
</script>
