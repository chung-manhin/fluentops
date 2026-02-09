<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b bg-white">
      <div class="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
        <h1 class="text-lg font-semibold">FluentOps</h1>
        <el-button type="primary" @click="animate">GSAP Animate</el-button>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-6 py-10">
      <el-card>
        <div class="space-y-4">
          <p class="text-sm text-slate-600">Vue3 + Vite + Pinia + Router + Axios + ElementPlus + TailwindCSS + GSAP</p>

          <div class="flex items-center gap-3">
            <div ref="box" class="h-10 w-10 rounded bg-indigo-500"></div>
            <div>
              <div class="text-sm font-medium">/health demo</div>
              <div class="text-xs text-slate-500">API base: {{ apiBase || '(empty)' }}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="checkHealth">Check API Health</el-button>
            <span class="text-sm">Result: <code>{{ result }}</code></span>
          </div>
        </div>
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import gsap from 'gsap';
import { http } from '../lib/http';
import type { HealthResponse } from '@fluentops/shared';

const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

const box = ref<globalThis.HTMLElement | null>(null);
const loading = ref(false);
const result = ref<string>('(not checked)');

function animate() {
  if (!box.value) return;
  gsap.fromTo(
    box.value,
    { x: 0, rotate: 0 },
    { x: 120, rotate: 360, duration: 0.8, ease: 'power2.out', yoyo: true, repeat: 1 },
  );
}

async function checkHealth() {
  loading.value = true;
  try {
    const { data } = await http.get<HealthResponse>('/health');
    result.value = JSON.stringify(data);
  } catch (err) {
    result.value = String(err);
  } finally {
    loading.value = false;
  }
}
</script>
