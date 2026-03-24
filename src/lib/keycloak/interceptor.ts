
import axios from "axios";
import {
  getAuthTokenSync,
  waitForNewAuthToken,
} from "@/lib/auth-bridge";
import { computeSpinabotSignature } from "./keycloak-client";

export const apiClient = axios.create({
  baseURL: "https://onprem.spinabot.com/api",
  // baseURL: "http://http://127.0.0.1:8081",
  timeout: 30000,
});

/* ---------------- REQUEST ---------------- */
apiClient.interceptors.request.use(async (config) => {
  const token = getAuthTokenSync();
  if (!token) return config;

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Spinabot-Sign"] = await computeSpinabotSignature(token);

  return config;
});

/* ---------------- RESPONSE ---------------- */
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (
      status === 401 &&
      message?.toLowerCase().includes("expired") &&
      !original._retry
    ) {
      original._retry = true;

      const oldToken = getAuthTokenSync();

      // 🔥 wait for refreshed session token
      const newToken = await waitForNewAuthToken(oldToken, 2000);

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        original.headers["X-Spinabot-Sign"] =
          await computeSpinabotSignature(newToken);
        return apiClient.request(original);
      }

      // still expired → force logout
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default apiClient;
