import { AuthUser } from '@veria/types-investor';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('auth_token');
  return !!token;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

export function parseJWT(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function hasScope(scope: string): boolean {
  const token = getAuthToken();
  if (!token) return false;

  const user = parseJWT(token);
  if (!user) return false;

  return user.scopes.includes(scope);
}

export function getUserRole(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  const user = parseJWT(token);
  return user?.role || null;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}