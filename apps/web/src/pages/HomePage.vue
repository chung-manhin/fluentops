<template>
  <div class="page-shell min-h-screen">
    <header class="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
      <div class="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-full px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--page-ink)] text-xs font-bold tracking-[0.24em] text-white">
            FO
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">FluentOps</p>
            <p class="text-sm text-[var(--soft-ink)]">{{ $t('home.features.title') }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--page-ink)] hover:bg-white"
            @click="handleToggleLocale"
          >
            {{ $t('nav.lang') }}
          </button>
          <template v-if="authStore.isAuthenticated">
            <router-link
              to="/dashboard"
              class="rounded-full bg-[var(--page-ink)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10261e]"
            >
              {{ $t('home.hero.dashboard') }}
            </router-link>
          </template>
          <template v-else>
            <router-link
              to="/login"
              class="rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[var(--page-ink)] hover:bg-white"
            >
              {{ $t('home.hero.login') }}
            </router-link>
            <router-link
              to="/register"
              class="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d695f]"
            >
              {{ $t('home.hero.getStarted') }}
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="glass-panel-strong float-in rounded-[2.4rem] p-8 md:p-10">
          <p class="section-kicker">{{ $t('home.howItWorks') }}</p>
          <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--page-ink)] md:text-6xl">
            <span class="gradient-text">{{ $t('home.hero.title') }}</span>
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-8 text-[var(--muted-ink)] md:text-lg">
            {{ $t('home.hero.desc') }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <template v-if="authStore.isAuthenticated">
              <router-link
                to="/dashboard"
                class="rounded-full bg-[var(--page-ink)] px-6 py-3 text-sm font-semibold text-white hover:bg-[#10261e]"
              >
                {{ $t('home.hero.dashboard') }}
              </router-link>
            </template>
            <template v-else>
              <router-link
                to="/register"
                class="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d695f]"
              >
                {{ $t('home.hero.getStarted') }}
              </router-link>
              <router-link
                to="/login"
                class="rounded-full border border-black/10 bg-white/75 px-6 py-3 text-sm font-semibold text-[var(--page-ink)] hover:bg-white"
              >
                {{ $t('home.hero.login') }}
              </router-link>
            </template>
          </div>

          <div class="fade-stagger mt-10 grid gap-4 md:grid-cols-3">
            <div
              v-for="item in summaryCards"
              :key="item.value"
              class="rounded-[1.6rem] border border-black/8 bg-white/72 p-4"
            >
              <p class="text-xs uppercase tracking-[0.24em] text-[var(--soft-ink)]">{{ item.label }}</p>
              <p class="mt-3 text-3xl font-semibold text-[var(--page-ink)]">{{ item.value }}</p>
              <p class="mt-2 text-sm text-[var(--muted-ink)]">{{ item.caption }}</p>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="glass-panel-strong float-in rounded-[2.4rem] p-6" style="animation-delay: 0.08s;">
            <div class="flex items-center justify-between">
              <div>
                <p class="section-kicker">{{ $t('nav.coach') }}</p>
                <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('coach.result') }}</h2>
              </div>
              <div class="signal-bars flex items-end gap-1.5">
                <span style="height: 16px;" />
                <span style="height: 28px;" />
                <span style="height: 20px;" />
                <span style="height: 34px;" />
              </div>
            </div>

            <div class="mt-6">
              <HeroOrbitScene />
            </div>

            <div class="mt-6 space-y-4">
              <div
                v-for="item in previewCards"
                :key="item.titleKey"
                class="rounded-[1.5rem] border border-black/8 bg-white/78 p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold text-[var(--page-ink)]">{{ $t(item.titleKey) }}</p>
                  <span class="rounded-full bg-[rgba(15,118,110,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    {{ $t(item.navKey) }}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{{ $t(item.descKey) }}</p>
              </div>
            </div>
          </div>

          <div class="glass-panel rounded-[2.2rem] p-6">
            <p class="section-kicker">{{ $t('home.howItWorks') }}</p>
            <div class="mt-5 space-y-4">
              <div
                v-for="(step, i) in steps"
                :key="step.titleKey"
                class="flex gap-4 rounded-[1.4rem] border border-black/8 bg-white/70 p-4"
              >
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--page-ink)] text-sm font-semibold text-white">
                  {{ i + 1 }}
                </div>
                <div>
                  <h3 class="font-semibold text-[var(--page-ink)]">{{ $t(step.titleKey) }}</h3>
                  <p class="mt-1 text-sm leading-7 text-[var(--muted-ink)]">{{ $t(step.descKey) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-8">
        <div class="glass-panel rounded-[2.4rem] p-6 md:p-8">
          <div>
            <p class="section-kicker">{{ $t('home.features.title') }}</p>
            <h2 class="mt-3 text-3xl font-semibold text-[var(--page-ink)]">{{ $t('home.features.title') }}</h2>
          </div>

          <div class="fade-stagger mt-8 grid gap-5 md:grid-cols-3">
            <div
              v-for="feature in features"
              :key="feature.titleKey"
              class="rounded-[1.8rem] border border-black/8 bg-white/78 p-6"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.12)] text-xl font-semibold text-[var(--accent)]">
                {{ feature.icon }}
              </div>
              <h3 class="mt-5 text-xl font-semibold text-[var(--page-ink)]">{{ $t(feature.titleKey) }}</h3>
              <p class="mt-3 text-sm leading-7 text-[var(--muted-ink)]">{{ $t(feature.descKey) }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { toggleLocale } from '../i18n';
import HeroOrbitScene from '../components/HeroOrbitScene.vue';

const authStore = useAuthStore();

function handleToggleLocale() {
  toggleLocale();
}

const features = [
  { icon: '01', titleKey: 'home.features.speaking', descKey: 'home.features.speakingDesc' },
  { icon: '02', titleKey: 'home.features.coach', descKey: 'home.features.coachDesc' },
  { icon: '03', titleKey: 'home.features.credits', descKey: 'home.features.creditsDesc' },
];

const steps = [
  { titleKey: 'home.steps.record', descKey: 'home.steps.recordDesc' },
  { titleKey: 'home.steps.analyze', descKey: 'home.steps.analyzeDesc' },
  { titleKey: 'home.steps.practice', descKey: 'home.steps.practiceDesc' },
];

const summaryCards = [
  { label: 'AI', value: '4-step', caption: 'diagnose -> rewrite -> drills -> score' },
  { label: 'WS/SSE', value: 'Hybrid', caption: 'websocket first, streaming fallback' },
  { label: 'Flow', value: 'Speak', caption: 'webrtc capture, assess, revisit, repeat' },
];

const previewCards = [
  { navKey: 'nav.speaking', titleKey: 'home.features.speaking', descKey: 'home.features.speakingDesc' },
  { navKey: 'nav.coach', titleKey: 'home.features.coach', descKey: 'home.features.coachDesc' },
  { navKey: 'nav.billing', titleKey: 'home.features.credits', descKey: 'home.features.creditsDesc' },
];
</script>
