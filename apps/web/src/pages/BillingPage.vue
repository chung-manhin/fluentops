<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b bg-white">
      <div class="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Billing</h1>
        <el-button @click="$router.push('/dashboard')">Dashboard</el-button>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <el-card>
        <template #header><h2 class="text-lg font-medium">Your Balance</h2></template>
        <p class="text-3xl font-bold">{{ balance }} credits</p>
      </el-card>

      <el-card>
        <template #header><h2 class="text-lg font-medium">Credit Packs</h2></template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="plan in plans" :key="plan.id" class="border rounded-lg p-4 flex flex-col items-center gap-3">
            <p class="font-medium">{{ plan.name }}</p>
            <p class="text-2xl font-bold">${{ (plan.priceCents / 100).toFixed(2) }}</p>
            <el-button type="primary" :loading="buying === plan.id" @click="buy(plan.id)">Buy</el-button>
          </div>
        </div>
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { http } from '../lib/http';

interface Plan { id: string; name: string; priceCents: number }

const plans = ref<Plan[]>([]);
const balance = ref(0);
const buying = ref('');

async function load() {
  const [p, b] = await Promise.all([
    http.get<Plan[]>('/billing/plans'),
    http.get<{ credits: number }>('/billing/balance'),
  ]);
  plans.value = p.data;
  balance.value = b.data.credits;
}

async function buy(planId: string) {
  buying.value = planId;
  try {
    const { data: order } = await http.post<{ id: string }>('/billing/order', { planId });
    await http.post('/billing/mock/pay', { orderId: order.id });
    ElMessage.success('Purchase successful!');
    await load();
  } catch {
    ElMessage.error('Purchase failed');
  } finally {
    buying.value = '';
  }
}

onMounted(load);
</script>
