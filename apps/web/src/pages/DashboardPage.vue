<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <section class="glass-panel-strong overflow-hidden rounded-[2.4rem] p-6 md:p-8">
      <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p class="section-kicker">{{ $t('nav.dashboard') }}</p>
          <h1 class="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[var(--page-ink)] md:text-5xl">
            {{ $t('dashboard.welcome', { email: authStore.user?.email }) }}
          </h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-ink)] md:text-base">
            {{ $t('home.hero.desc') }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <router-link
              to="/speaking"
              class="rounded-full bg-[var(--page-ink)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10261e]"
            >
              {{ $t('dashboard.startRecording') }}
            </router-link>
            <router-link
              to="/coach"
              class="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0d695f]"
            >
              {{ $t('dashboard.newAssessment') }}
            </router-link>
            <router-link
              to="/billing"
              class="rounded-full border border-black/10 bg-white/75 px-5 py-3 text-sm font-semibold text-[var(--page-ink)] hover:bg-white"
            >
              {{ $t('dashboard.buyCredits') }}
            </router-link>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <HeroOrbitScene />
          </div>

          <div class="rounded-[1.8rem] border border-black/8 bg-white/76 p-5 sm:col-span-2">
            <p class="text-xs uppercase tracking-[0.24em] text-[var(--soft-ink)]">{{ $t('dashboard.creditBalance') }}</p>
            <div class="mt-4 flex items-end justify-between gap-4">
              <div>
                <p class="text-4xl font-semibold text-[var(--page-ink)]">{{ creditBalance }}</p>
                <p class="mt-2 text-sm text-[var(--muted-ink)]">{{ $t('coach.credits', { n: creditBalance }) }}</p>
              </div>
              <div class="signal-bars flex items-end gap-1.5">
                <span style="height: 14px;" />
                <span style="height: 30px;" />
                <span style="height: 18px;" />
                <span style="height: 24px;" />
              </div>
            </div>
          </div>

          <div
            v-for="stat in statCards"
            :key="stat.label"
            class="rounded-[1.8rem] border border-black/8 bg-white/76 p-5"
          >
            <p class="text-xs uppercase tracking-[0.22em] text-[var(--soft-ink)]">{{ stat.label }}</p>
            <el-skeleton v-if="loadingStats" :rows="1" animated />
            <template v-else>
              <p class="mt-3 text-3xl font-semibold text-[var(--page-ink)]">{{ stat.value }}</p>
              <p class="mt-2 text-sm text-[var(--muted-ink)]">{{ stat.caption }}</p>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="glass-panel rounded-[2.2rem] p-6">
        <p class="section-kicker">{{ $t('home.howItWorks') }}</p>
        <div class="mt-5 space-y-4">
          <router-link
            v-for="action in actions"
            :key="action.to"
            :to="action.to"
            class="block rounded-[1.6rem] border border-black/8 bg-white/78 p-5 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-[var(--page-ink)]">{{ action.title }}</p>
                <p class="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{{ action.subtitle }}</p>
              </div>
              <span class="rounded-full bg-[rgba(15,118,110,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {{ action.badge }}
              </span>
            </div>
          </router-link>
        </div>
      </div>

      <div class="glass-panel rounded-[2.2rem] p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="section-kicker">{{ $t('nav.coach') }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('dashboard.recentAssessments') }}</h2>
          </div>
          <div class="rounded-full border border-black/8 bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--muted-ink)]">
            {{ totalAssessments }}
          </div>
        </div>

        <el-skeleton v-if="loadingAssessments" :rows="4" animated class="mt-6" />
        <template v-else>
          <div v-if="assessments.length === 0" class="mt-6 rounded-[1.6rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm text-[var(--soft-ink)]">
            {{ $t('dashboard.noAssessments') }}
          </div>
          <div v-else class="mt-6 space-y-4">
            <div
              v-for="item in assessments"
              :key="item.id"
              class="rounded-[1.6rem] border border-black/8 bg-white/78 p-5"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-[var(--page-ink)]">
                    {{ item.inputText || '(recording)' }}
                  </p>
                  <p class="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--soft-ink)]">
                    {{ new Date(item.createdAt).toLocaleString() }}
                  </p>
                </div>
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    item.status === 'SUCCEEDED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : item.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700',
                  ]"
                >
                  {{ item.status }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { http } from '../lib/http';
import HeroOrbitScene from '../components/HeroOrbitScene.vue';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

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

const statCards = computed(() => [
  {
    label: t('dashboard.totalRecordings'),
    value: totalRecordings.value,
    caption: t('home.features.speakingDesc'),
  },
  {
    label: t('dashboard.totalAssessments'),
    value: totalAssessments.value,
    caption: t('home.features.coachDesc'),
  },
]);

const actions = computed(() => [
  {
    to: '/speaking',
    title: t('dashboard.startRecording'),
    subtitle: t('home.steps.recordDesc'),
    badge: t('nav.speaking'),
  },
  {
    to: '/coach',
    title: t('dashboard.newAssessment'),
    subtitle: t('home.steps.analyzeDesc'),
    badge: t('nav.coach'),
  },
  {
    to: '/billing',
    title: t('dashboard.buyCredits'),
    subtitle: t('home.features.creditsDesc'),
    badge: t('nav.billing'),
  },
]);

onMounted(async () => {
  if (!authStore.user && authStore.isAuthenticated) {
    try {
      await authStore.fetchUser();
    } catch (err) {
      console.error('Failed to fetch user profile', err);
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
