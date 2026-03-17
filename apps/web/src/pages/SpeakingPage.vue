<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <section class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div class="space-y-6">
        <section class="glass-panel-strong rounded-[2.2rem] p-6 md:p-7">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="section-kicker">{{ $t('nav.speaking') }}</p>
              <h1 class="mt-2 text-3xl font-semibold text-[var(--page-ink)]">{{ $t('speaking.record') }}</h1>
            </div>
            <div class="rounded-full border border-black/8 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--soft-ink)]">
              {{ state }}
            </div>
          </div>

          <div class="mt-8 rounded-[2rem] border border-black/8 bg-white/82 p-6">
            <div class="flex min-h-[14rem] flex-col items-center justify-center rounded-[1.8rem] bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(29,78,216,0.08))] px-6 text-center">
              <div
                class="flex h-24 w-24 items-center justify-center rounded-full border border-white/40 bg-white/80 text-2xl font-semibold text-[var(--page-ink)] shadow-lg"
              >
                VO
              </div>

              <div class="signal-bars mt-6 flex items-end gap-1.5">
                <span v-for="(bar, index) in levelBars" :key="index" :style="{ height: `${bar}px` }" />
              </div>

              <p class="mt-6 text-lg font-semibold text-[var(--page-ink)]">
                {{
                  state === 'recording'
                    ? $t('speaking.recording')
                    : state === 'paused'
                      ? $t('speaking.paused')
                      : $t('speaking.startRecording')
                }}
              </p>
              <p class="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{{ $t('home.steps.recordDesc') }}</p>
              <p class="mt-3 rounded-full border border-black/8 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft-ink)]">
                {{ $t('speaking.liveMeter', { state: levelText }) }}
              </p>
            </div>

            <div class="mt-6 flex flex-wrap justify-center gap-3">
              <el-button
                v-if="state === 'idle'"
                type="danger"
                class="!rounded-full !px-6 !py-3 !text-sm !font-semibold"
                @click="startRecording"
                :disabled="uploading"
              >
                {{ $t('speaking.startRecording') }}
              </el-button>
              <el-button
                v-if="state === 'recording'"
                type="warning"
                class="!rounded-full !px-6 !py-3 !text-sm !font-semibold"
                @click="pauseRecording"
              >
                {{ $t('speaking.pause') }}
              </el-button>
              <el-button
                v-if="state === 'paused'"
                type="success"
                class="!rounded-full !px-6 !py-3 !text-sm !font-semibold"
                @click="resumeRecording"
              >
                {{ $t('speaking.resume') }}
              </el-button>
              <el-button
                v-if="state !== 'idle'"
                type="info"
                class="!rounded-full !px-6 !py-3 !text-sm !font-semibold"
                @click="stopRecording"
              >
                {{ $t('speaking.stop') }}
              </el-button>
            </div>

            <p v-if="uploading" class="mt-4 text-center text-sm font-medium text-[var(--accent-3)]">
              {{ $t('speaking.uploading') }}
            </p>
          </div>
        </section>

        <section v-if="playUrl" class="glass-panel rounded-[2.2rem] p-6">
          <p class="section-kicker">{{ $t('speaking.playback') }}</p>
          <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('speaking.playback') }}</h2>
          <div class="mt-6 rounded-[1.8rem] border border-black/8 bg-white/78 p-5">
            <audio :src="playUrl" controls class="w-full" :aria-label="$t('speaking.playback')" />
          </div>
        </section>
      </div>

      <section class="glass-panel rounded-[2.2rem] p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="section-kicker">{{ $t('speaking.myRecordings') }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('speaking.myRecordings') }}</h2>
          </div>
          <div class="rounded-full border border-black/8 bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--muted-ink)]">
            {{ recordings.length }}
          </div>
        </div>

        <div v-if="recordings.length === 0" class="mt-6 rounded-[1.6rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm text-[var(--soft-ink)]">
          {{ $t('speaking.noRecordings') }}
        </div>

        <div v-else class="mt-6 space-y-4">
          <div
            v-for="rec in recordings"
            :key="rec.id"
            class="rounded-[1.6rem] border border-black/8 bg-white/78 p-5"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-[var(--page-ink)]">{{ rec.objectKey.split('/').pop() }}</p>
                <p class="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--soft-ink)]">
                  {{ new Date(rec.createdAt).toLocaleString() }}
                </p>
                <p class="mt-1 text-sm text-[var(--muted-ink)]">{{ formatBytes(rec.sizeBytes) }}</p>
              </div>
              <el-button class="!rounded-full" size="small" @click="play(rec.id)">{{ $t('speaking.play') }}</el-button>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { http } from '../lib/http';
import { useMicAnalyzer } from '../composables/useMicAnalyzer';

const { t } = useI18n();

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

const mediaRecorder = shallowRef<MediaRecorder | null>(null);
const stream = shallowRef<MediaStream | null>(null);
const chunks = shallowRef<Blob[]>([]);
const recordStart = ref(0);
const { levelBars, levelText, attach, cleanup } = useMicAnalyzer();

async function loadRecordings() {
  const { data } = await http.get<RecordingItem[]>('/media');
  recordings.value = data;
}

onMounted(loadRecordings);
onBeforeUnmount(cleanup);

async function startRecording() {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({ audio: true });
    await attach(stream.value);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder.value = new MediaRecorder(stream.value, { mimeType });
    chunks.value = [];
    recordStart.value = Date.now();
    mediaRecorder.value.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.value.push(e.data);
    };
    mediaRecorder.value.onstop = async () => {
      stream.value?.getTracks().forEach((t) => t.stop());
      cleanup();
      const blob = new Blob(chunks.value, { type: 'audio/webm' });
      const durationMs = Date.now() - recordStart.value;
      await uploadBlob(blob, durationMs);
    };
    mediaRecorder.value.start();
    state.value = 'recording';
  } catch {
    cleanup();
    ElMessage.error(t('speaking.micDenied'));
  }
}

function pauseRecording() {
  mediaRecorder.value?.pause();
  state.value = 'paused';
}

function resumeRecording() {
  mediaRecorder.value?.resume();
  state.value = 'recording';
}

function stopRecording() {
  mediaRecorder.value?.stop();
  state.value = 'idle';
}

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

async function uploadBlob(blob: Blob, durationMs: number) {
  if (blob.size > MAX_UPLOAD_SIZE) {
    ElMessage.error(t('speaking.fileTooLarge'));
    return;
  }
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

    ElMessage.success(t('speaking.uploaded'));
    await loadRecordings();
  } catch {
    ElMessage.error(t('speaking.uploadFailed'));
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
