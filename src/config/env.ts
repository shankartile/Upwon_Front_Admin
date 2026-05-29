export const env = {
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
};
