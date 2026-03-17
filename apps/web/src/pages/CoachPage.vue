<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <section class="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <div class="space-y-6">
        <section class="glass-panel-strong rounded-[2.2rem] p-6 md:p-7">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="section-kicker">{{ $t('nav.coach') }}</p>
              <h1 class="mt-2 text-3xl font-semibold text-[var(--page-ink)]">{{ $t('coach.submitTitle') }}</h1>
            </div>
            <div class="rounded-full border border-black/8 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--page-ink)]">
              {{ $t('coach.credits', { n: credits }) }}
            </div>
          </div>

          <div class="mt-6 rounded-[1.8rem] border border-black/8 bg-white/82 p-4">
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="8"
              :placeholder="$t('coach.placeholder')"
              :disabled="loading"
            />
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-3">
            <el-button
              type="primary"
              class="!rounded-full !border-0 !bg-[var(--page-ink)] !px-6 !py-3 !text-sm !font-semibold"
              @click="submit"
              :loading="loading"
              :disabled="!inputText.trim() || credits <= 0"
            >
              {{ $t('coach.assess') }}
            </el-button>
            <router-link
              v-if="credits <= 0"
              to="/billing"
              class="rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--page-ink)] hover:bg-white"
            >
              {{ $t('coach.buyCredits') }}
            </router-link>
          </div>
        </section>

        <section class="glass-panel rounded-[2.2rem] p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="section-kicker">{{ $t('coach.history') }}</p>
              <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('coach.history') }}</h2>
            </div>
            <el-button
              size="small"
              class="!rounded-full"
              @click="loadHistory"
              :loading="historyLoading"
            >
              {{ $t('coach.refresh') }}
            </el-button>
          </div>

          <div v-if="history.length === 0" class="mt-6 rounded-[1.5rem] border border-dashed border-black/10 bg-white/65 p-6 text-sm text-[var(--soft-ink)]">
            {{ $t('coach.noHistory') }}
          </div>

          <div v-else class="mt-6 space-y-4">
            <div
              v-for="item in history"
              :key="item.id"
              class="rounded-[1.5rem] border border-black/8 bg-white/78 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-[var(--page-ink)]">
                    {{ item.inputText || '(recording)' }}
                  </p>
                  <p class="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--soft-ink)]">
                    {{ new Date(item.createdAt).toLocaleString() }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
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
                  <el-button size="small" class="!rounded-full" @click="viewAssessment(item.id)">
                    {{ $t('coach.view') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="space-y-6 xl:sticky xl:top-8 xl:self-start">
        <section v-if="streaming" class="glass-panel-strong rounded-[2.2rem] p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="section-kicker">{{ $t('coach.progress') }}</p>
              <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('coach.progress') }}</h2>
            </div>
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-[rgba(15,118,110,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {{ $t('coach.realtime') }}
              </span>
              <div class="signal-bars flex items-end gap-1.5">
                <span style="height: 14px;" />
                <span style="height: 30px;" />
                <span style="height: 18px;" />
                <span style="height: 24px;" />
              </div>
            </div>
          </div>
          <el-progress
            class="mt-6"
            :percentage="progressPct"
            :status="progressPct === 100 ? 'success' : undefined"
            aria-label="Assessment progress"
          />
          <p class="mt-3 text-sm text-[var(--muted-ink)]">{{ progressStage }}</p>
        </section>

        <el-alert v-if="errorMsg" type="error" :title="errorMsg" show-icon class="mb-4" />

        <section v-if="result" class="glass-panel-strong rounded-[2.2rem] p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="section-kicker">{{ $t('coach.result') }}</p>
              <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('coach.result') }}</h2>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <span class="rounded-full bg-[rgba(15,118,110,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {{ $t('coach.averageScore', { n: averageScore }) }}
              </span>
              <el-button size="small" class="!rounded-full" :loading="sendingEmail" @click="emailSummary">
                {{ $t('coach.emailSummary') }}
              </el-button>
              <el-button size="small" class="!rounded-full" @click="downloadPosterImage">
                {{ $t('coach.downloadPoster') }}
              </el-button>
            </div>
          </div>

          <div v-if="result.rubric" class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div
              v-for="(val, key) in result.rubric"
              :key="key"
              class="rounded-[1.4rem] border border-black/8 bg-white/78 p-4 text-center"
            >
              <el-progress type="circle" :percentage="val" :width="76" :aria-label="`${key}: ${val}%`" />
              <p class="mt-3 text-xs font-semibold capitalize tracking-[0.16em] text-[var(--soft-ink)]">{{ key }}</p>
            </div>
          </div>

          <div v-if="result.issues?.length" class="mt-6 rounded-[1.6rem] border border-black/8 bg-white/78 p-5">
            <h3 class="font-semibold text-[var(--page-ink)]">{{ $t('coach.issues') }}</h3>
            <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted-ink)]">
              <li v-for="(issue, i) in result.issues" :key="i">{{ issue }}</li>
            </ul>
          </div>

          <div v-if="result.rewrites?.length" class="mt-4 rounded-[1.6rem] border border-black/8 bg-white/78 p-5">
            <h3 class="font-semibold text-[var(--page-ink)]">{{ $t('coach.rewrites') }}</h3>
            <ul class="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted-ink)]">
              <li v-for="(rw, i) in result.rewrites" :key="i">{{ rw }}</li>
            </ul>
          </div>

          <div v-if="result.drills?.length" class="mt-4 rounded-[1.6rem] border border-black/8 bg-white/78 p-5">
            <h3 class="font-semibold text-[var(--page-ink)]">{{ $t('coach.drills') }}</h3>
            <ul class="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted-ink)]">
              <li v-for="(drill, i) in result.drills" :key="i">{{ drill }}</li>
            </ul>
          </div>

          <div
            v-if="result.feedbackMarkdown"
            class="mt-4 rounded-[1.6rem] border border-black/8 bg-[rgba(15,118,110,0.06)] p-5 text-sm leading-7 text-[var(--page-ink)] whitespace-pre-wrap"
          >
            {{ result.feedbackMarkdown }}
          </div>
        </section>

        <section v-else class="glass-panel rounded-[2.2rem] p-6">
          <p class="section-kicker">{{ $t('coach.result') }}</p>
          <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('coach.result') }}</h2>
          <div class="mt-6 rounded-[1.8rem] border border-dashed border-black/10 bg-white/62 p-8 text-sm leading-7 text-[var(--soft-ink)]">
            {{ $t('home.steps.analyzeDesc') }}
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { http } from '../lib/http';
import { useAuthStore } from '../stores/auth';
import { useAssessmentRealtime } from '../composables/useAssessmentRealtime';
import { downloadAssessmentPoster } from '../lib/poster';

const { t } = useI18n();
const authStore = useAuthStore();
const realtime = useAssessmentRealtime();

interface AssessResult {
  rubric?: Record<string, number>;
  issues?: string[];
  rewrites?: string[];
  drills?: string[];
  feedbackMarkdown?: string;
}

interface HistoryItem {
  id: string;
  status: string;
  inputType: string;
  inputText: string | null;
  rubricJson: Record<string, number> | null;
  createdAt: string;
}

const inputText = ref('');
const loading = ref(false);
const streaming = ref(false);
const progressPct = ref(0);
const progressStage = ref('');
const errorMsg = ref('');
const result = ref<AssessResult | null>(null);
const history = ref<HistoryItem[]>([]);
const historyLoading = ref(false);
const credits = ref(0);
const sendingEmail = ref(false);
const currentAssessmentId = ref('');
const currentAssessmentInput = ref('');
const currentAssessmentCreatedAt = ref(new Date().toISOString());

const averageScore = computed(() => {
  const values = Object.values(result.value?.rubric ?? {});
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
});

async function loadBalance() {
  try {
    const { data } = await http.get<{ credits: number }>('/billing/balance');
    credits.value = data.credits;
  } catch (err) {
    console.warn('Failed to load balance', err);
  }
}

async function loadHistory() {
  historyLoading.value = true;
  try {
    const { data } = await http.get<HistoryItem[]>('/ai/assessments');
    history.value = data;
  } catch (err) {
    console.warn('Failed to load assessment history', err);
  } finally {
    historyLoading.value = false;
  }
}

onMounted(() => {
  loadHistory();
  loadBalance();
});
onBeforeUnmount(() => realtime.stop());

async function viewAssessment(id: string) {
  try {
    const { data } = await http.get<{
      status: string;
      rubricJson: Record<string, number> | null;
      feedbackMarkdown: string | null;
      issues?: string[];
      rewrites?: string[];
      drills?: string[];
      createdAt: string;
      inputText: string | null;
    }>(`/ai/assess/${id}`);
    currentAssessmentId.value = id;
    currentAssessmentCreatedAt.value = data.createdAt;
    currentAssessmentInput.value = data.inputText ?? '';
    if (data.status === 'SUCCEEDED') {
      result.value = mapAssessmentPayload(data);
      streaming.value = false;
      errorMsg.value = '';
    } else if (data.status === 'FAILED') {
      errorMsg.value = t('coach.failed');
      result.value = null;
    }
  } catch (err) {
    console.warn('Failed to load assessment details', err);
    errorMsg.value = t('coach.loadError');
  }
}

async function submit() {
  loading.value = true;
  streaming.value = false;
  errorMsg.value = '';
  result.value = null;
  progressPct.value = 0;
  progressStage.value = '';

  try {
    const payload = inputText.value.trim();
    currentAssessmentInput.value = payload;
    currentAssessmentCreatedAt.value = new Date().toISOString();

    const { data } = await http.post<{ assessmentId: string; sseUrl: string; wsUrl?: string }>('/ai/assess', {
      inputType: 'text',
      text: payload,
    });

    currentAssessmentId.value = data.assessmentId;
    streaming.value = true;
    await realtime.stream({
      assessmentId: data.assessmentId,
      onProgress: (payload) => {
        progressPct.value = payload.pct || 0;
        progressStage.value = payload.stage || '';
      },
      onFinal: (payload) => {
        progressPct.value = 100;
        result.value = mapAssessmentPayload(payload as Parameters<typeof mapAssessmentPayload>[0]);
        streaming.value = false;
        errorMsg.value = '';
      },
      onError: (payload) => {
        errorMsg.value = payload.message || t('coach.failed');
        streaming.value = false;
      },
      onFallbackPoll: () => pollResult(data.assessmentId),
    });
    await loadHistory();
    await loadBalance();
  } catch (err) {
    console.warn('Failed to start assessment', err);
    errorMsg.value = t('coach.startError');
  } finally {
    loading.value = false;
  }
}

const MAX_POLL_RETRIES = 12;

async function pollResult(assessmentId: string, retries = 0) {
  try {
    const { data } = await http.get<{
      status: string;
      rubricJson: Record<string, number> | null;
      feedbackMarkdown: string | null;
      issues?: string[];
      rewrites?: string[];
      drills?: string[];
      createdAt: string;
      inputText: string | null;
    }>(`/ai/assess/${assessmentId}`);
    if (data.status === 'SUCCEEDED' && data.rubricJson) {
      currentAssessmentId.value = assessmentId;
      currentAssessmentCreatedAt.value = data.createdAt;
      currentAssessmentInput.value = data.inputText ?? '';
      result.value = mapAssessmentPayload(data);
      progressPct.value = 100;
    } else if (data.status === 'FAILED') {
      errorMsg.value = t('coach.failed');
    } else if (retries < MAX_POLL_RETRIES) {
      setTimeout(() => pollResult(assessmentId, retries + 1), 5000);
      return;
    } else {
      errorMsg.value = t('coach.failed');
    }
  } catch (err) {
    console.warn('Failed to poll assessment result', err);
    if (retries < MAX_POLL_RETRIES) {
      setTimeout(() => pollResult(assessmentId, retries + 1), 5000);
      return;
    }
  }
  streaming.value = false;
}

async function emailSummary() {
  if (!currentAssessmentId.value) return;
  sendingEmail.value = true;
  try {
    await http.post('/notifications/assessment-email', { assessmentId: currentAssessmentId.value });
    ElMessage.success(t('coach.emailSuccess'));
  } catch (err) {
    console.warn('Failed to send assessment summary email', err);
    ElMessage.error(t('coach.emailFailed'));
  } finally {
    sendingEmail.value = false;
  }
}

function downloadPosterImage() {
  if (!result.value) return;
  downloadAssessmentPoster({
    email: authStore.user?.email ?? 'fluentops@example.com',
    createdAt: currentAssessmentCreatedAt.value,
    inputText: currentAssessmentInput.value,
    rubric: result.value.rubric,
    feedback: result.value.feedbackMarkdown ?? '',
  });
}

function mapAssessmentPayload(payload: {
  rubricJson?: Record<string, number> | null;
  rubric?: Record<string, number>;
  feedbackMarkdown?: string | null;
  issues?: string[];
  rewrites?: string[];
  drills?: string[];
}) {
  return {
    rubric: payload.rubricJson ?? payload.rubric ?? undefined,
    feedbackMarkdown: payload.feedbackMarkdown ?? undefined,
    issues: payload.issues,
    rewrites: payload.rewrites,
    drills: payload.drills,
  };
}
</script>
