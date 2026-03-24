


let accessToken: string | null = null;

let tokenResolve: ((token: string | null) => void) | null = null;

const tokenReady = new Promise<string | null>((resolve) => {
  tokenResolve = resolve;
});

export function setAccessToken(token: string | null) {
  accessToken = token;

  if (tokenResolve) {
    tokenResolve(token);
    tokenResolve = null; // resolve once
  }
}

export async function waitForAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  return tokenReady;
}

export function getAccessToken(): string | null {
  return accessToken;
}

