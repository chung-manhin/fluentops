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
            <div class="signal-bars flex items-end gap-1.5">
              <span style="height: 14px;" />
              <span style="height: 30px;" />
              <span style="height: 18px;" />
              <span style="height: 24px;" />
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
            <span class="rounded-full bg-[rgba(15,118,110,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              {{ $t('nav.coach') }}
            </span>
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
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { http } from '../lib/http';

const { t } = useI18n();

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
let lastEventId = -1;

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

async function viewAssessment(id: string) {
  try {
    const { data } = await http.get<{
      status: string;
      rubricJson: Record<string, number> | null;
      feedbackMarkdown: string | null;
      issues?: string[];
      rewrites?: string[];
      drills?: string[];
    }>(`/ai/assess/${id}`);
    if (data.status === 'SUCCEEDED') {
      result.value = {
        rubric: data.rubricJson ?? undefined,
        feedbackMarkdown: data.feedbackMarkdown ?? undefined,
        issues: data.issues,
        rewrites: data.rewrites,
        drills: data.drills,
      };
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
  lastEventId = -1;

  try {
    const { data } = await http.post<{ assessmentId: string; sseUrl: string }>('/ai/assess', {
      inputType: 'text',
      text: inputText.value,
    });

    streaming.value = true;
    await readSSE(data.assessmentId);
    await loadHistory();
    await loadBalance();
  } catch (err) {
    console.warn('Failed to start assessment', err);
    errorMsg.value = t('coach.startError');
  } finally {
    loading.value = false;
  }
}

async function readSSE(assessmentId: string) {
  const baseUrl = http.defaults.baseURL || 'http://localhost:3000';
  const token = localStorage.getItem('accessToken');
  const sinceParam = lastEventId >= 0 ? `?since=${lastEventId}` : '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/ai/assess/${assessmentId}/stream${sinceParam}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    await pollResult(assessmentId);
    return;
  }

  if (!res.ok || !res.body) {
    clearTimeout(timeout);
    errorMsg.value = t('coach.streamError');
    streaming.value = false;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(timeout);
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split('\n');
        let eventType = '';
        let eventData = '';
        let eventId = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7);
          else if (line.startsWith('data: ')) eventData = line.slice(6);
          else if (line.startsWith('id: ')) eventId = line.slice(4);
        }
        if (eventId) lastEventId = parseInt(eventId, 10);
        if (!eventData) continue;

        try {
          const payload = JSON.parse(eventData);
          if (eventType === 'progress') {
            progressPct.value = payload.pct || 0;
            progressStage.value = payload.stage || '';
          } else if (eventType === 'final') {
            progressPct.value = 100;
            result.value = payload;
            streaming.value = false;
          } else if (eventType === 'error') {
            errorMsg.value = payload.message || t('coach.failed');
            streaming.value = false;
          }
        } catch (err) {
          console.warn('Failed to parse SSE event', err);
        }
      }
    }
  } catch {
    // fall through to polling
  } finally {
    reader.cancel().catch(() => {});
  }

  if (!result.value && !errorMsg.value) {
    await pollResult(assessmentId);
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
    }>(`/ai/assess/${assessmentId}`);
    if (data.status === 'SUCCEEDED' && data.rubricJson) {
      result.value = {
        rubric: data.rubricJson,
        feedbackMarkdown: data.feedbackMarkdown ?? undefined,
        issues: data.issues,
        rewrites: data.rewrites,
        drills: data.drills,
      };
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
</script>
