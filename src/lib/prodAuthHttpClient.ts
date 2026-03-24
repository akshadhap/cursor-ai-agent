import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth();

export async function prodAuthRequest(
  audience: string,
  options: {
    url: string;
    method?: string;
    data?: any;
    headers?: Record<string, string>;
  }
) {
  const client = await auth.getIdTokenClient(audience);

  return client.request({
    url: options.url,
    method: options.method ?? "GET",
    data: options.data,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}
