<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50">
    <el-card class="w-full max-w-md">
      <template #header>
        <h2 class="text-xl font-semibold text-center">Register</h2>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="Email" type="email" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" placeholder="Password (min 6 chars)" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" class="w-full">
            Register
          </el-button>
        </el-form-item>
      </el-form>
      <div class="text-center text-sm">
        Already have an account?
        <router-link to="/login" class="text-blue-500">Login</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ email: '', password: '' });

const rules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Invalid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' },
  ],
};

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await authStore.register(form.email, form.password);
    ElMessage.success('Registration successful! Please login.');
    router.push('/login');
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}
</script>
