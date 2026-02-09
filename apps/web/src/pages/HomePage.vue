<template>
  <div class="min-h-screen flex flex-col">
    <!-- Nav -->
    <header class="bg-white border-b">
      <div class="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <span class="text-lg font-bold text-indigo-600">FluentOps</span>
        <div class="flex items-center gap-3">
          <button class="text-xs text-slate-400 hover:text-slate-600" @click="handleToggleLocale">{{ $t('nav.lang') }}</button>
          <template v-if="authStore.isAuthenticated">
            <router-link to="/dashboard" class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{{ $t('home.hero.dashboard') }}</router-link>
          </template>
          <template v-else>
            <router-link to="/login" class="text-sm font-medium text-slate-600 hover:text-slate-900">{{ $t('home.hero.login') }}</router-link>
            <router-link to="/register" class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{{ $t('home.hero.getStarted') }}</router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="bg-white py-20">
      <div class="mx-auto max-w-3xl px-6 text-center">
        <h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{{ $t('home.hero.title') }}</h1>
        <p class="mt-4 text-lg text-slate-600">{{ $t('home.hero.desc') }}</p>
        <div class="mt-8 flex justify-center gap-4">
          <template v-if="authStore.isAuthenticated">
            <router-link to="/dashboard" class="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">{{ $t('home.hero.dashboard') }}</router-link>
          </template>
          <template v-else>
            <router-link to="/register" class="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">{{ $t('home.hero.getStarted') }}</router-link>
            <router-link to="/login" class="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{{ $t('home.hero.login') }}</router-link>
          </template>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="bg-slate-50 py-16">
      <div class="mx-auto max-w-5xl px-6">
        <h2 class="text-center text-2xl font-bold text-slate-900">{{ $t('home.features.title') }}</h2>
        <div class="mt-10 grid gap-8 sm:grid-cols-3">
          <div v-for="f in features" :key="f.titleKey" class="rounded-lg bg-white p-6 shadow-sm">
            <div class="text-3xl">{{ f.icon }}</div>
            <h3 class="mt-3 font-semibold text-slate-900">{{ $t(f.titleKey) }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ $t(f.descKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-white py-16">
      <div class="mx-auto max-w-3xl px-6">
        <h2 class="text-center text-2xl font-bold text-slate-900">{{ $t('home.howItWorks') }}</h2>
        <div class="mt-10 space-y-8">
          <div v-for="(step, i) in steps" :key="i" class="flex gap-4">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{{ i + 1 }}</div>
            <div>
              <h3 class="font-semibold text-slate-900">{{ $t(step.titleKey) }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ $t(step.descKey) }}</p>
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
import { toggleLocale } from '../i18n';

const authStore = useAuthStore();

function handleToggleLocale() {
  toggleLocale();
}

const features = [
  { icon: '🎙️', titleKey: 'home.features.speaking', descKey: 'home.features.speakingDesc' },
  { icon: '🤖', titleKey: 'home.features.coach', descKey: 'home.features.coachDesc' },
  { icon: '💳', titleKey: 'home.features.credits', descKey: 'home.features.creditsDesc' },
];

const steps = [
  { titleKey: 'home.steps.record', descKey: 'home.steps.recordDesc' },
  { titleKey: 'home.steps.analyze', descKey: 'home.steps.analyzeDesc' },
  { titleKey: 'home.steps.practice', descKey: 'home.steps.practiceDesc' },
];
</script>
