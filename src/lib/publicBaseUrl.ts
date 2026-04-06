import type { NextRequest } from "next/server";

export function getPublicBaseUrl(request: NextRequest | Request): string {
  const forwardedProtoRaw = request.headers.get("x-forwarded-proto");
  const forwardedHostRaw = request.headers.get("x-forwarded-host");
  const hostRaw = request.headers.get("host");

  const forwardedProto = forwardedProtoRaw?.split(",")[0]?.trim();
  const forwardedHost = forwardedHostRaw?.split(",")[0]?.trim();
  const host = hostRaw?.split(",")[0]?.trim();

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const url = new URL(request.url);

  if (host) {
    return `${url.protocol}//${host}`;
  }

  return url.origin;
}
