<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <section class="glass-panel-strong rounded-[2.2rem] p-6 md:p-8">
      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p class="section-kicker">{{ $t('nav.billing') }}</p>
          <h1 class="mt-2 text-3xl font-semibold text-[var(--page-ink)]">{{ $t('billing.balance') }}</h1>
          <p class="mt-4 text-sm leading-7 text-[var(--muted-ink)]">{{ $t('home.features.creditsDesc') }}</p>
        </div>
        <div class="rounded-[2rem] border border-black/8 bg-white/78 p-6">
          <p class="text-xs uppercase tracking-[0.24em] text-[var(--soft-ink)]">{{ $t('billing.balance') }}</p>
          <div class="mt-4 flex items-end justify-between gap-4">
            <div>
              <p class="text-4xl font-semibold text-[var(--page-ink)]">{{ balance }}</p>
              <p class="mt-2 text-sm text-[var(--muted-ink)]">{{ $t('billing.credits', { n: balance }) }}</p>
            </div>
            <div class="signal-bars flex items-end gap-1.5">
              <span style="height: 14px;" />
              <span style="height: 30px;" />
              <span style="height: 18px;" />
              <span style="height: 24px;" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-8">
      <div class="glass-panel rounded-[2.2rem] p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="section-kicker">{{ $t('billing.packs') }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-[var(--page-ink)]">{{ $t('billing.packs') }}</h2>
          </div>
          <div class="rounded-full border border-black/8 bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--muted-ink)]">
            {{ plans.length }}
          </div>
        </div>

        <div class="mt-6 grid gap-5 md:grid-cols-2">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="rounded-[1.8rem] border border-black/8 bg-white/78 p-6"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-[var(--soft-ink)]">{{ plan.code }}</p>
                <p class="mt-3 text-2xl font-semibold text-[var(--page-ink)]">{{ plan.name }}</p>
              </div>
              <span class="rounded-full bg-[rgba(15,118,110,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {{ $t('billing.credits', { n: plan.credits }) }}
              </span>
            </div>

            <p class="mt-6 text-4xl font-semibold text-[var(--page-ink)]">
              {{ $t('billing.price', { amount: (plan.priceCents / 100).toFixed(2) }) }}
            </p>

            <el-button
              type="primary"
              class="!mt-6 !w-full !rounded-full !border-0 !bg-[var(--page-ink)] !py-3 !text-sm !font-semibold"
              :loading="buying === plan.id"
              @click="buy(plan.id)"
            >
              {{ $t('billing.buy') }}
            </el-button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { http } from '../lib/http';
import type { PlanDto, CreditBalance } from '@fluentops/shared';

const { t } = useI18n();

interface OrderResult { id: string; payUrl?: string }

const plans = ref<PlanDto[]>([]);
const balance = ref(0);
const buying = ref('');

async function load() {
  try {
    const [p, b] = await Promise.all([
      http.get<PlanDto[]>('/billing/plans'),
      http.get<CreditBalance>('/billing/balance'),
    ]);
    plans.value = p.data;
    balance.value = b.data.credits;
  } catch {
    ElMessage.error(t('billing.failed'));
  }
}

async function buy(planId: string) {
  buying.value = planId;
  try {
    const { data: order } = await http.post<OrderResult>('/billing/order', { planId });
    if (order.payUrl) {
      window.location.href = order.payUrl;
      return;
    }
    await http.post('/billing/mock/pay', { orderId: order.id });
    ElMessage.success(t('billing.success'));
    await load();
  } catch {
    ElMessage.error(t('billing.failed'));
  } finally {
    buying.value = '';
  }
}

onMounted(load);
</script>
