<template>
  <main class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <el-card>
      <template #header><h2 class="text-lg font-medium">{{ $t('billing.balance') }}</h2></template>
      <p class="text-3xl font-bold">{{ $t('billing.credits', { n: balance }) }}</p>
    </el-card>

    <el-card>
      <template #header><h2 class="text-lg font-medium">{{ $t('billing.packs') }}</h2></template>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="plan in plans" :key="plan.id" class="border rounded-lg p-4 flex flex-col items-center gap-3">
          <p class="font-medium">{{ plan.name }}</p>
          <p class="text-2xl font-bold">{{ $t('billing.price', { amount: (plan.priceCents / 100).toFixed(2) }) }}</p>
          <el-button type="primary" :loading="buying === plan.id" @click="buy(plan.id)">{{ $t('billing.buy') }}</el-button>
        </div>
      </div>
    </el-card>
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
