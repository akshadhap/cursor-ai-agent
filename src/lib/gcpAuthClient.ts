import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth();

/**
 * Equivalent to GcpAuthWebClientFilter.identityTokenFilter(...)
 */
export async function requestWithIdentityToken(
  audience: string,
  options: {
    url: string;
    method?: string;
    data?: any;
    headers?: Record<string, string>;
  }
) {
  // This is the Node.js equivalent of:
  // IdTokenCredentials.setTargetAudience(audience)
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