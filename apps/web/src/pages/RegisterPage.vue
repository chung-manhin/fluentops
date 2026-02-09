<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50">
    <el-card class="w-full max-w-md">
      <template #header>
        <h2 class="text-xl font-semibold text-center">{{ $t('auth.register') }}</h2>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit">
        <el-form-item prop="email">
          <el-input v-model="form.email" :placeholder="$t('auth.email')" type="email" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" :placeholder="$t('auth.passwordHint')" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" class="w-full">
            {{ $t('auth.register') }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="text-center text-sm">
        {{ $t('auth.hasAccount') }}
        <router-link to="/login" class="text-blue-500">{{ $t('auth.login') }}</router-link>
      </div>
    </el-card>
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
    { min: 6, message: t('auth.passwordMin'), trigger: 'blur' },
  ],
}));

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

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
