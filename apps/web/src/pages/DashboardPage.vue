<template>
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
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  if (!authStore.user && authStore.isAuthenticated) {
    try {
      await authStore.fetchUser();
    } catch {
      router.push('/login');
    }
  }
});
</script>
