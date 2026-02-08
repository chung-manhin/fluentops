<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b bg-white">
      <div class="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Speaking Practice</h1>
        <div class="flex gap-2">
          <el-button @click="$router.push('/dashboard')">Dashboard</el-button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <!-- Recorder -->
      <el-card>
        <template #header><h2 class="text-lg font-medium">Record</h2></template>
        <div class="flex items-center gap-4">
          <el-button
            v-if="!recording"
            type="danger"
            @click="startRecording"
            :disabled="uploading"
          >
            Start Recording
          </el-button>
          <el-button v-else type="warning" @click="stopRecording">
            Stop Recording
          </el-button>
          <span v-if="recording" class="text-sm text-red-500 animate-pulse">● Recording…</span>
          <span v-if="uploading" class="text-sm text-blue-500">Uploading…</span>
        </div>
      </el-card>

      <!-- Recordings list -->
      <el-card>
        <template #header><h2 class="text-lg font-medium">My Recordings</h2></template>
        <div v-if="recordings.length === 0" class="text-gray-400 text-sm">No recordings yet.</div>
        <div v-for="rec in recordings" :key="rec.id" class="flex items-center justify-between py-2 border-b last:border-b-0">
          <div>
            <p class="text-sm font-medium">{{ rec.filename }}</p>
            <p class="text-xs text-gray-400">{{ new Date(rec.createdAt).toLocaleString() }}</p>
          </div>
          <el-button size="small" @click="play(rec.id)">Play</el-button>
        </div>
      </el-card>

      <!-- Player -->
      <el-card v-if="playUrl">
        <template #header><h2 class="text-lg font-medium">Playback</h2></template>
        <audio :src="playUrl" controls class="w-full" />
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { http } from '../lib/http';

interface Recording {
  id: string;
  filename: string;
  createdAt: string;
}

const recording = ref(false);
const uploading = ref(false);
const recordings = ref<Recording[]>([]);
const playUrl = ref<string | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

async function loadRecordings() {
  const { data } = await http.get<Recording[]>('/media');
  recordings.value = data;
}

onMounted(loadRecordings);

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: 'audio/webm' });
    await uploadBlob(blob);
  };
  mediaRecorder.start();
  recording.value = true;
}

function stopRecording() {
  mediaRecorder?.stop();
  recording.value = false;
}

async function uploadBlob(blob: Blob) {
  uploading.value = true;
  try {
    const filename = `recording-${Date.now()}.webm`;
    const { data: presign } = await http.post<{ id: string; uploadUrl: string }>('/media/presign', {
      filename,
      mimeType: 'audio/webm',
    });

    await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'audio/webm' },
    });

    await http.post(`/media/${presign.id}/complete`, {
      bytes: blob.size,
    });

    await loadRecordings();
  } finally {
    uploading.value = false;
  }
}

async function play(id: string) {
  const { data } = await http.get<{ playUrl: string }>(`/media/${id}`);
  playUrl.value = data.playUrl;
}
</script>
