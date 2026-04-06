import axios from "axios";

export const devAuthHttpClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional interceptor (logging / debugging)
devAuthHttpClient.interceptors.request.use((config) => {
  console.log("[DEV AUTH REQUEST]", config.method, config.url);
  return config;
});
