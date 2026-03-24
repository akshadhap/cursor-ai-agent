/* --------------------------------------------------
   🔒 Env helper (TYPE-SAFE)
-------------------------------------------------- */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/* --------------------------------------------------
   🔐 Get AUTH API URL (runtime validation)
   - Validates AUTH_ENV at runtime, not at build time
   - Returns the appropriate AUTH API base URL
-------------------------------------------------- */
export function getAuthApi(): string {
  const AUTH_ENV = process.env.AUTH_ENV;

  if (AUTH_ENV !== "development" && AUTH_ENV !== "production") {
    throw new Error("AUTH_ENV must be either 'development' or 'production'");
  }

  return AUTH_ENV === "production"
    ? requireEnv("NEXT_PUBLIC_AUTH_API_BASE", process.env.NEXT_PUBLIC_AUTH_API_BASE)
    : requireEnv("DEV_AUTH_API_BASE", process.env.DEV_AUTH_API_BASE);
}
