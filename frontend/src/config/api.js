const fallbackApiUrl = "http://10.170.117.155:8000";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/$/, "");
