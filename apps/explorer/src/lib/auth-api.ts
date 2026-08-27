const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // send/receive the httpOnly auth cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message[0] : (body?.message ?? 'Something went wrong.');
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export const authApi = {
  signup: (data: { email: string; password: string; name?: string }) =>
    request<{ message: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  verifyOtp: (data: { email: string; code: string; purpose: 'SIGNUP_VERIFY' }) =>
    request<{ user: PublicUser }>('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),

  resendOtp: (data: { email: string; purpose: 'SIGNUP_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET' }) =>
    request<{ message: string }>('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ user: PublicUser }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  refresh: () => request<{ ok: boolean }>('/auth/refresh', { method: 'POST' }),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  forgotPassword: (data: { email: string }) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<PublicUser>('/auth/me'),
};
