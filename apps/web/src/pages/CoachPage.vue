<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b bg-white">
      <div class="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
        <h1 class="text-lg font-semibold">AI Coach</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">Credits: {{ credits }}</span>
          <el-button @click="$router.push('/dashboard')">Dashboard</el-button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <!-- Input form -->
      <el-card>
        <template #header><h2 class="text-lg font-medium">Submit Text for Assessment</h2></template>
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="4"
          placeholder="Type or paste your English text here…"
          :disabled="loading"
        />
        <div class="mt-4">
          <el-button type="primary" @click="submit" :loading="loading" :disabled="!inputText.trim() || credits <= 0">
            Assess
          </el-button>
          <router-link v-if="credits <= 0" to="/billing" class="text-sm text-blue-500 ml-3">Buy credits</router-link>
        </div>
      </el-card>

      <!-- Progress -->
      <el-card v-if="streaming">
        <template #header><h2 class="text-lg font-medium">Progress</h2></template>
        <el-progress :percentage="progressPct" :status="progressPct === 100 ? 'success' : undefined" />
        <p class="mt-2 text-sm text-gray-500">{{ progressStage }}</p>
      </el-card>

      <!-- Error -->
      <el-alert v-if="errorMsg" type="error" :title="errorMsg" show-icon class="mb-4" />

      <!-- Result card -->
      <el-card v-if="result">
        <template #header><h2 class="text-lg font-medium">Assessment Result</h2></template>

        <div v-if="result.rubric" class="grid grid-cols-5 gap-4 mb-6">
          <div v-for="(val, key) in result.rubric" :key="key" class="text-center">
            <el-progress type="circle" :percentage="val" :width="80" />
            <p class="mt-1 text-xs text-gray-500 capitalize">{{ key }}</p>
          </div>
        </div>

        <div v-if="result.issues?.length" class="mb-4">
          <h3 class="font-medium mb-2">Issues Found</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm">
            <li v-for="(issue, i) in result.issues" :key="i">{{ issue }}</li>
          </ul>
        </div>

        <div v-if="result.rewrites?.length" class="mb-4">
          <h3 class="font-medium mb-2">Suggested Rewrites</h3>
          <ul class="list-decimal pl-5 space-y-1 text-sm">
            <li v-for="(rw, i) in result.rewrites" :key="i">{{ rw }}</li>
          </ul>
        </div>

        <div v-if="result.drills?.length" class="mb-4">
          <h3 class="font-medium mb-2">Practice Drills</h3>
          <ul class="list-decimal pl-5 space-y-1 text-sm">
            <li v-for="(drill, i) in result.drills" :key="i">{{ drill }}</li>
          </ul>
        </div>

        <div v-if="result.feedbackMarkdown" class="mt-4 p-4 bg-gray-50 rounded text-sm whitespace-pre-wrap">
          {{ result.feedbackMarkdown }}
        </div>
      </el-card>

      <!-- History -->
      <el-card>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium">Recent Assessments</h2>
            <el-button size="small" @click="loadHistory" :loading="historyLoading">Refresh</el-button>
          </div>
        </template>
        <div v-if="history.length === 0" class="text-gray-400 text-sm">No assessments yet.</div>
        <div v-for="item in history" :key="item.id" class="flex items-center justify-between py-2 border-b last:border-b-0">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ item.inputText || '(recording)' }}</p>
            <p class="text-xs text-gray-400">{{ new Date(item.createdAt).toLocaleString() }} · {{ item.status }}</p>
          </div>
          <el-button size="small" @click="viewAssessment(item.id)">View</el-button>
        </div>
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { http } from '../lib/http';

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
  } catch {
    // ignore
  }
}

async function loadHistory() {
  historyLoading.value = true;
  try {
    const { data } = await http.get<HistoryItem[]>('/ai/assessments');
    history.value = data;
  } catch {
    // ignore
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
    const { data } = await http.get(`/ai/assess/${id}`);
    if (data.status === 'SUCCEEDED') {
      result.value = { rubric: data.rubricJson, feedbackMarkdown: data.feedbackMarkdown };
      streaming.value = false;
      errorMsg.value = '';
    } else if (data.status === 'FAILED') {
      errorMsg.value = 'Assessment failed';
      result.value = null;
    }
  } catch {
    errorMsg.value = 'Failed to load assessment';
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
  } catch {
    errorMsg.value = 'Failed to start assessment';
  } finally {
    loading.value = false;
  }
}

async function readSSE(assessmentId: string) {
  const baseUrl = http.defaults.baseURL || 'http://localhost:3000';
  const token = localStorage.getItem('accessToken');
  const sinceParam = lastEventId >= 0 ? `?since=${lastEventId}` : '';
  const res = await fetch(`${baseUrl}/ai/assess/${assessmentId}/stream${sinceParam}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok || !res.body) {
    errorMsg.value = 'Failed to connect to SSE stream';
    streaming.value = false;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
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
          errorMsg.value = payload.message || 'Assessment failed';
          streaming.value = false;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // If stream ended without final event, poll the result
  if (!result.value && !errorMsg.value) {
    try {
      const { data } = await http.get(`/ai/assess/${assessmentId}`);
      if (data.status === 'SUCCEEDED' && data.rubricJson) {
        result.value = { rubric: data.rubricJson, feedbackMarkdown: data.feedbackMarkdown };
        progressPct.value = 100;
      } else if (data.status === 'FAILED') {
        errorMsg.value = 'Assessment failed';
      }
    } catch {
      // ignore
    }
    streaming.value = false;
  }
}
</script>
