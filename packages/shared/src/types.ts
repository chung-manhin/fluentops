export type HealthResponse = {
  ok: true;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserProfile = {
  id: string;
  email: string;
  createdAt: string;
};

export type CreditBalance = {
  credits: number;
};

export type PlanDto = {
  id: string;
  code: string;
  name: string;
  credits: number;
  priceCents: number;
};
