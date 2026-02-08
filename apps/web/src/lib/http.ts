import type { HealthResponse } from '@fluentops/shared';
import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

export type { HealthResponse };
