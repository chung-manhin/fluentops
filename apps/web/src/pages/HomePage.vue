<template>
  <div class="min-h-screen flex flex-col">
    <!-- Nav -->
    <header class="bg-white border-b">
      <div class="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <span class="text-lg font-bold text-indigo-600">FluentOps</span>
        <div v-if="authStore.isAuthenticated">
          <router-link to="/dashboard" class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Go to Dashboard</router-link>
        </div>
        <div v-else class="flex gap-3">
          <router-link to="/login" class="text-sm font-medium text-slate-600 hover:text-slate-900">Login</router-link>
          <router-link to="/register" class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Get Started</router-link>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="bg-white py-20">
      <div class="mx-auto max-w-3xl px-6 text-center">
        <h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Master English Speaking with AI</h1>
        <p class="mt-4 text-lg text-slate-600">Record yourself, get instant AI-powered feedback on grammar, fluency, and pronunciation. Improve faster with personalized drills.</p>
        <div class="mt-8 flex justify-center gap-4">
          <template v-if="authStore.isAuthenticated">
            <router-link to="/dashboard" class="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Go to Dashboard</router-link>
          </template>
          <template v-else>
            <router-link to="/register" class="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Get Started</router-link>
            <router-link to="/login" class="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Login</router-link>
          </template>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="bg-slate-50 py-16">
      <div class="mx-auto max-w-5xl px-6">
        <h2 class="text-center text-2xl font-bold text-slate-900">Everything you need to improve</h2>
        <div class="mt-10 grid gap-8 sm:grid-cols-3">
          <div v-for="f in features" :key="f.title" class="rounded-lg bg-white p-6 shadow-sm">
            <div class="text-3xl">{{ f.icon }}</div>
            <h3 class="mt-3 font-semibold text-slate-900">{{ f.title }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-white py-16">
      <div class="mx-auto max-w-3xl px-6">
        <h2 class="text-center text-2xl font-bold text-slate-900">How it works</h2>
        <div class="mt-10 space-y-8">
          <div v-for="(step, i) in steps" :key="i" class="flex gap-4">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{{ i + 1 }}</div>
            <div>
              <h3 class="font-semibold text-slate-900">{{ step.title }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t bg-slate-50 py-6 text-center text-sm text-slate-500">
      FluentOps &copy; 2026
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const features = [
  { icon: '🎙️', title: 'Speaking Practice', desc: 'Record audio directly in your browser and track your progress over time.' },
  { icon: '🤖', title: 'AI Coach', desc: 'Get detailed feedback on grammar, fluency, vocabulary, coherence, and pronunciation.' },
  { icon: '💳', title: 'Credit System', desc: 'Pay only for what you use. Buy credit packs and spend them on assessments.' },
];

const steps = [
  { title: 'Record or type', desc: 'Use the built-in recorder or paste text you want assessed.' },
  { title: 'AI analyzes your English', desc: 'Our AI coach scores your text across 5 dimensions and suggests improvements.' },
  { title: 'Practice and improve', desc: 'Follow personalized drills and rewrite suggestions to level up.' },
];
</script>
