import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const DEFAULT_BACKEND_URL = API_BASE_URL;

export function getBackendUrl() {
  return DEFAULT_BACKEND_URL;
}

export function createApiClient(baseURL = getBackendUrl()) {
  const client = axios.create({
    baseURL,
    timeout: 8000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("soc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}

export function getApiErrorMessage(error, fallback = "Request failed. Check backend connection.") {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || JSON.stringify(item))
      .filter(Boolean)
      .join(" ");
  }

  if (error?.message === "Network Error" || !error?.response) {
    return "Cannot connect to SOC backend server.";
  }

  return fallback;
}
