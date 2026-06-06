const fallbackApiUrl = "https://sentinel-soc-backend-fxb8.onrender.com";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/$/, "");
