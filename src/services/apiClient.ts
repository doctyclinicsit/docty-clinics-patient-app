import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = 'https://api.eka.care';
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJFQ18xNzc3MTg1MzEyOTI2IiwiYi1pZCI6IjcxNzc1MDI0OTEyNDkxODQiLCJjLWlkIjoiRUNfMTc3NzE4NTMxMjkyNiIsImNjIjp7InBleCI6MTgwNTg0NjQwMCwicHN0IjoidHJ1ZSJ9LCJpYXQiOjE3NzcxODU4ODEsImlkcCI6ImFwaS1rZXkiLCJpc3MiOiJlbXIuZWthLmNhcmUiLCJqdGkiOiIzYzZjNmEzYS1lMTc3LTQxYjYtYmJjOS00ZWM3YjdlNzNmN2IiLCJvaWQiOiIxNzc3MTg1NDI5NzkyNTgiLCJwZXgiOjE4MDU4NDY0MDAsInBzIjoiQVAiLCJwc3QiOiJ0cnVlIiwidXVpZCI6IjZmMjdlZGM0LWY3MjgtNGNlOC05OTY5LWM4MGE4NmEzNzQ0NSIsInctaWQiOiI3MTc3NTAyNDkxMjQ5MTg0Iiwidy1uIjoiRG9jdHkgQ2xpbmljcyJ9.-X-LSrA1tqoc4Ga53tnEMz_nEy3ZcWLaOHMK0-AmHeU';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  public get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  public post<T>(url: string, data?: any, config = {}) {
    return this.client.post<T>(url, data, config);
  }

  public put<T>(url: string, data?: any, config = {}) {
    return this.client.put<T>(url, data, config);
  }

  public delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
