<template>
  <div class="min-h-screen flex">
    <!-- Branding panel (hidden on mobile) -->
    <div class="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-800 items-center justify-center">
      <div class="text-center text-white px-10">
        <h1 class="text-4xl font-bold">FluentOps</h1>
        <p class="mt-4 text-lg text-indigo-200">{{ $t('home.hero.desc') }}</p>
      </div>
    </div>
    <!-- Form panel -->
    <div class="flex flex-1 items-center justify-center bg-slate-50 px-6">
      <div class="w-full max-w-md">
        <h2 class="text-2xl font-bold text-slate-900 text-center mb-6">{{ $t('auth.login') }}</h2>
        <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit">
          <el-form-item prop="email">
            <el-input v-model="form.email" :placeholder="$t('auth.email')" type="email" size="large" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" :placeholder="$t('auth.password')" type="password" show-password size="large" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" native-type="submit" :loading="loading" class="w-full" size="large">
              {{ $t('auth.login') }}
            </el-button>
          </el-form-item>
        </el-form>
        <div class="text-center text-sm text-slate-500">
          {{ $t('auth.noAccount') }}
          <router-link to="/register" class="text-indigo-600 hover:text-indigo-700 font-medium">{{ $t('auth.register') }}</router-link>
        </div>
      </div>
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
  password: [{ required: true, message: t('auth.passwordRequired'), trigger: 'blur' }],
}));

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await authStore.login(form.email, form.password);
    router.push('/dashboard');
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('auth.loginFailed');
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}
</script>
