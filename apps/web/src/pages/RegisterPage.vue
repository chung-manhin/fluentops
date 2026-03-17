<template>
  <div class="page-shell min-h-screen px-4 py-6 sm:px-6">
    <div class="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section class="glass-panel-strong flex flex-col justify-between rounded-[2.4rem] p-8 md:p-10">
        <div>
          <router-link to="/" class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--page-ink)] text-xs font-bold tracking-[0.24em] text-white">
              FO
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">FluentOps</p>
              <p class="text-sm text-[var(--soft-ink)]">{{ $t('nav.speaking') }}</p>
            </div>
          </router-link>

          <p class="section-kicker mt-10">{{ $t('auth.register') }}</p>
          <h1 class="mt-3 text-4xl font-semibold leading-tight text-[var(--page-ink)] md:text-5xl">
            {{ $t('home.hero.title') }}
          </h1>
          <p class="mt-5 max-w-xl text-sm leading-8 text-[var(--muted-ink)] md:text-base">
            {{ $t('home.steps.practiceDesc') }}
          </p>
        </div>

        <div class="mt-10 space-y-4">
          <div class="rounded-[1.6rem] border border-black/8 bg-white/76 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-[var(--soft-ink)]">{{ $t('home.steps.record') }}</p>
            <p class="mt-3 text-sm leading-7 text-[var(--muted-ink)]">{{ $t('home.steps.recordDesc') }}</p>
          </div>
          <div class="rounded-[1.6rem] border border-black/8 bg-white/76 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-[var(--soft-ink)]">{{ $t('home.steps.analyze') }}</p>
            <p class="mt-3 text-sm leading-7 text-[var(--muted-ink)]">{{ $t('home.steps.analyzeDesc') }}</p>
          </div>
        </div>
      </section>

      <section class="glass-panel rounded-[2.4rem] p-8 md:p-10">
        <div class="mx-auto max-w-md">
          <p class="section-kicker">{{ $t('auth.register') }}</p>
          <h2 class="mt-3 text-3xl font-semibold text-[var(--page-ink)]">{{ $t('auth.register') }}</h2>

          <el-form ref="formRef" :model="form" :rules="rules" class="mt-8 space-y-2" @submit.prevent="handleSubmit">
            <el-form-item prop="email">
              <el-input v-model="form.email" :placeholder="$t('auth.email')" type="email" size="large" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="form.password" :placeholder="$t('auth.passwordHint')" type="password" show-password size="large" />
            </el-form-item>
            <el-form-item class="!mb-0">
              <el-button
                type="primary"
                native-type="submit"
                :loading="loading"
                class="!mt-3 !w-full !rounded-full !border-0 !bg-[var(--accent)] !py-3 !text-sm !font-semibold"
                size="large"
              >
                {{ $t('auth.register') }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="mt-6 text-center text-sm text-[var(--muted-ink)]">
            {{ $t('auth.hasAccount') }}
            <router-link to="/login" class="font-semibold text-[var(--accent)] hover:text-[#0d695f]">
              {{ $t('auth.login') }}
            </router-link>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ email: '', password: '' });

const rules = computed<FormRules>(() => ({
  email: [
    { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.passwordRequired'), trigger: 'blur' },
    { min: 8, message: t('auth.passwordMin'), trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/, message: t('auth.passwordMin'), trigger: 'blur' },
  ],
}));

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  form.email = form.email.trim();
  loading.value = true;
  try {
    await authStore.register(form.email, form.password);
    ElMessage.success(t('auth.registerSuccess'));
    router.push('/login');
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('auth.registerFailed');
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}
</script>
