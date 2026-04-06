import { devAuthHttpClient } from "./devAuthHttpClient";
import { prodAuthRequest } from "./prodAuthHttpClient";

type RequestOptions = {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
};

export async function authRequest(
  audience: string,
  options: RequestOptions,
  isProdOverride?: boolean
) {
  const isProd =
    typeof isProdOverride === "boolean"
      ? isProdOverride
      : process.env.AUTH_ENV === "production";

  // 🔴 DEV AUTH
  if (!isProd) {
    return devAuthHttpClient.request({
      url: options.url,
      method: options.method ?? "GET",
      data: options.data,
      headers: options.headers,
    });
  }

  // 🟢 PROD AUTH (GCP Identity Token)
  return prodAuthRequest(audience, options);
}
