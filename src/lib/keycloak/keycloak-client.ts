
const sha256Hex = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

let cachedSignature: string | null = null;
let cachedDate: string | null = null;
let cachedToken: string | null = null;

export const computeSpinabotSignature = async (token: string) => {
  const today = new Date().toISOString().slice(0, 10);

  if (
    cachedSignature &&
    cachedDate === today &&
    cachedToken === token
  ) {
    return cachedSignature;
  }

  const raw = `Bearer ${token}:${today}`;
  cachedSignature = await sha256Hex(raw);
  cachedDate = today;
  cachedToken = token;

  return cachedSignature;
};


