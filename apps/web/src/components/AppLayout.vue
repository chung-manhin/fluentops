<template>
  <div class="page-shell">
    <div class="fixed left-0 right-0 top-4 z-30 mx-4 md:hidden">
      <div class="glass-panel flex items-center justify-between rounded-full px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--page-ink)] text-xs font-bold tracking-[0.2em] text-white">
            FO
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--page-ink)]">FluentOps</p>
            <p class="text-xs text-[var(--soft-ink)]">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[var(--page-ink)]"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-[rgba(15,24,20,0.35)] backdrop-blur-sm md:hidden"
      @click="sidebarOpen = false"
    />

    <aside
      :class="[
        'fixed inset-y-4 left-4 z-50 flex w-[18rem] flex-col rounded-[2rem] border border-white/10 bg-[#112019] p-4 text-white shadow-[0_30px_80px_rgba(7,12,10,0.35)] transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0',
      ]"
    >
      <div class="rounded-[1.6rem] bg-[linear-gradient(160deg,rgba(15,118,110,0.75),rgba(17,32,25,0.92))] p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold tracking-[0.22em]">
            FO
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">English Lab</p>
            <p class="text-xl font-semibold">FluentOps</p>
          </div>
        </div>
      </div>

      <nav class="mt-6 flex-1 space-y-2">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'group flex items-center gap-3 rounded-[1.2rem] px-3 py-3 text-sm font-medium transition-all',
            $route.path === item.to
              ? 'bg-white text-[var(--page-ink)] shadow-lg'
              : 'text-white/75 hover:bg-white/10 hover:text-white',
          ]"
          @click="sidebarOpen = false"
        >
          <span
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold tracking-[0.16em]',
              $route.path === item.to ? 'bg-[var(--page-ink)] text-white' : 'bg-white/10 text-white/80',
            ]"
          >
            {{ item.short }}
          </span>
          <div class="min-w-0">
            <p class="truncate">{{ $t(item.labelKey) }}</p>
            <p
              :class="[
                'text-xs',
                $route.path === item.to ? 'text-[var(--soft-ink)]' : 'text-white/45 group-hover:text-white/60',
              ]"
            >{{ $t(item.captionKey) }}</p>
          </div>
        </router-link>
      </nav>

      <div class="mt-4 rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
        <p class="truncate text-sm font-medium">{{ authStore.user?.email }}</p>
        <div class="mt-4 flex items-center gap-2">
          <button
            class="flex-1 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/14"
            @click="handleToggleLocale"
          >
            {{ $t('nav.lang') }}
          </button>
          <button
            class="flex-1 rounded-full border border-white/15 bg-[#e86f51] px-3 py-2 text-xs font-semibold text-white hover:bg-[#d95a3b]"
            @click="handleLogout"
          >
            {{ $t('nav.logout') }}
          </button>
        </div>
      </div>
    </aside>

    <div class="min-h-screen md:pl-[22rem]">
      <div class="pt-24 md:pt-4">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { toggleLocale } from '../i18n';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const sidebarOpen = ref(false);

const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', short: 'DB', captionKey: 'dashboard.recentAssessments' },
  { to: '/speaking', labelKey: 'nav.speaking', short: 'SP', captionKey: 'speaking.record' },
  { to: '/coach', labelKey: 'nav.coach', short: 'AI', captionKey: 'coach.progress' },
  { to: '/billing', labelKey: 'nav.billing', short: 'CR', captionKey: 'billing.balance' },
];

watch(() => route.path, () => {
  sidebarOpen.value = false;
});

function handleToggleLocale() {
  toggleLocale();
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>
