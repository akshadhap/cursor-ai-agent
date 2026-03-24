
let token: string | null = null;
let listeners: ((t: string | null) => void)[] = [];

export function setAuthToken(newToken: string | null) {
  token = newToken;
  listeners.forEach((l) => l(token));
  listeners = [];
}

export function getAuthTokenSync(): string | null {
  return token;
}

export function waitForNewAuthToken(
  oldToken: string | null,
  timeoutMs = 1500
): Promise<string | null> {
  if (token && token !== oldToken) {
    return Promise.resolve(token);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    listeners.push((t) => {
      if (t && t !== oldToken) {
        clearTimeout(timer);
        resolve(t);
      }
    });
  });
}
