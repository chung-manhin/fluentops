<template>
  <main class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <!-- Recorder -->
    <el-card>
      <template #header><h2 class="text-lg font-medium">Record</h2></template>
      <div class="flex items-center gap-4">
        <el-button
          v-if="state === 'idle'"
          type="danger"
          @click="startRecording"
          :disabled="uploading"
        >
          Start Recording
        </el-button>
        <el-button v-if="state === 'recording'" type="warning" @click="pauseRecording">
          Pause
        </el-button>
        <el-button v-if="state === 'paused'" type="success" @click="resumeRecording">
          Resume
        </el-button>
        <el-button v-if="state !== 'idle'" type="info" @click="stopRecording">
          Stop
        </el-button>
        <span v-if="state === 'recording'" class="text-sm text-red-500 animate-pulse">● Recording…</span>
        <span v-if="state === 'paused'" class="text-sm text-yellow-500">⏸ Paused</span>
        <span v-if="uploading" class="text-sm text-blue-500">Uploading…</span>
      </div>
    </el-card>

    <!-- Recordings list -->
    <el-card>
      <template #header><h2 class="text-lg font-medium">My Recordings</h2></template>
      <div v-if="recordings.length === 0" class="text-gray-400 text-sm">No recordings yet.</div>
      <div v-for="rec in recordings" :key="rec.id" class="flex items-center justify-between py-2 border-b last:border-b-0">
        <div>
          <p class="text-sm font-medium">{{ rec.objectKey.split('/').pop() }}</p>
          <p class="text-xs text-gray-400">{{ new Date(rec.createdAt).toLocaleString() }} · {{ formatBytes(rec.sizeBytes) }}</p>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { http } from '../lib/http';

interface RecordingItem {
  id: string;
  objectKey: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

const state = ref<'idle' | 'recording' | 'paused'>('idle');
const uploading = ref(false);
const recordings = ref<RecordingItem[]>([]);
const playUrl = ref<string | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let chunks: Blob[] = [];
let recordStart = 0;

async function loadRecordings() {
  const { data } = await http.get<RecordingItem[]>('/media');
  recordings.value = data;
}

onMounted(loadRecordings);

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks = [];
    recordStart = Date.now();
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      stream?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const durationMs = Date.now() - recordStart;
      await uploadBlob(blob, durationMs);
    };
    mediaRecorder.start();
    state.value = 'recording';
  } catch {
    ElMessage.error('Microphone access denied');
  }
}

function pauseRecording() {
  mediaRecorder?.pause();
  state.value = 'paused';
}

function resumeRecording() {
  mediaRecorder?.resume();
  state.value = 'recording';
}

function stopRecording() {
  mediaRecorder?.stop();
  state.value = 'idle';
}

async function uploadBlob(blob: Blob, durationMs: number) {
  uploading.value = true;
  try {
    const filename = `recording-${Date.now()}.webm`;
    const { data: presign } = await http.post<{ uploadUrl: string; objectKey: string }>('/media/presign', {
      filename,
      contentType: 'audio/webm',
    });

    await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'audio/webm' },
    });

    await http.post('/media/complete', {
      objectKey: presign.objectKey,
      sizeBytes: blob.size,
      mimeType: 'audio/webm',
      durationMs,
    });

    ElMessage.success('Recording uploaded');
    await loadRecordings();
  } catch {
    ElMessage.error('Upload failed, please retry');
  } finally {
    uploading.value = false;
  }
}

async function play(id: string) {
  const { data } = await http.get<{ playUrl: string }>(`/media/${id}`);
  playUrl.value = data.playUrl;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>
