<template>
  <main class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <!-- Welcome -->
    <h1 class="text-2xl font-bold text-slate-900">{{ $t('dashboard.welcome', { email: authStore.user?.email }) }}</h1>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-3">
      <el-card shadow="hover">
        <el-skeleton v-if="loadingStats" :rows="1" animated />
        <template v-else>
          <p class="text-sm text-slate-500">{{ $t('dashboard.creditBalance') }}</p>
          <p class="mt-1 text-3xl font-bold">{{ creditBalance }}</p>
        </template>
      </el-card>
      <el-card shadow="hover">
        <el-skeleton v-if="loadingStats" :rows="1" animated />
        <template v-else>
          <p class="text-sm text-slate-500">{{ $t('dashboard.totalRecordings') }}</p>
          <p class="mt-1 text-3xl font-bold">{{ totalRecordings }}</p>
        </template>
      </el-card>
      <el-card shadow="hover">
        <el-skeleton v-if="loadingStats" :rows="1" animated />
        <template v-else>
          <p class="text-sm text-slate-500">{{ $t('dashboard.totalAssessments') }}</p>
          <p class="mt-1 text-3xl font-bold">{{ totalAssessments }}</p>
        </template>
      </el-card>
    </div>

    <!-- Quick actions -->
    <div class="flex flex-wrap gap-3">
      <router-link to="/speaking" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{{ $t('dashboard.startRecording') }}</router-link>
      <router-link to="/coach" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{{ $t('dashboard.newAssessment') }}</router-link>
      <router-link to="/billing" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{{ $t('dashboard.buyCredits') }}</router-link>
    </div>

    <!-- Recent assessments -->
    <el-card>
      <template #header><h2 class="text-lg font-medium">{{ $t('dashboard.recentAssessments') }}</h2></template>
      <el-skeleton v-if="loadingAssessments" :rows="3" animated />
      <template v-else>
        <div v-if="assessments.length === 0" class="text-sm text-slate-400">{{ $t('dashboard.noAssessments') }}</div>
        <div v-for="item in assessments" :key="item.id" class="flex items-center justify-between py-2 border-b last:border-b-0">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ item.inputText || '(recording)' }}</p>
            <p class="text-xs text-slate-400">{{ new Date(item.createdAt).toLocaleString() }}</p>
          </div>
          <span :class="[
            'ml-3 rounded-full px-2 py-0.5 text-xs font-medium',
            item.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' :
            item.status === 'FAILED' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700',
          ]">{{ item.status }}</span>
        </div>
      </template>
    </el-card>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { http } from '../lib/http';

const router = useRouter();
const authStore = useAuthStore();

const loadingStats = ref(true);
const loadingAssessments = ref(true);
const creditBalance = ref(0);
const totalRecordings = ref(0);
const totalAssessments = ref(0);

interface AssessmentItem {
  id: string;
  status: string;
  inputText: string | null;
  createdAt: string;
}

const assessments = ref<AssessmentItem[]>([]);

onMounted(async () => {
  if (!authStore.user && authStore.isAuthenticated) {
    try {
      await authStore.fetchUser();
    } catch {
      router.push('/login');
      return;
    }
  }

  const [balanceRes, recordingsRes, assessmentsRes] = await Promise.allSettled([
    http.get<{ credits: number }>('/billing/balance'),
    http.get<unknown[]>('/media'),
    http.get<AssessmentItem[]>('/ai/assessments'),
  ]);

  if (balanceRes.status === 'fulfilled') creditBalance.value = balanceRes.value.data.credits;
  if (recordingsRes.status === 'fulfilled') totalRecordings.value = recordingsRes.value.data.length;
  if (assessmentsRes.status === 'fulfilled') {
    const all = assessmentsRes.value.data;
    totalAssessments.value = all.length;
    assessments.value = all.slice(0, 5);
  }

  loadingStats.value = false;
  loadingAssessments.value = false;
});
</script>
