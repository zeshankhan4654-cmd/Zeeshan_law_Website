import Constants from "expo-constants";

/**
 * Where the API lives.
 *
 * On a real handset "localhost" is the phone, not your computer, so the dev
 * default is derived from the address Expo itself is being served from —
 * scan the QR code and the app finds the API with no configuration. A real
 * deployment sets EXPO_PUBLIC_API_URL instead.
 */
function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:4000`;

  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * JSON in, JSON out. A bearer token is attached when one is supplied —
 * React Native has no cookie jar, so mobile authenticates with a token from
 * the device keychain rather than the httpOnly cookie the web uses.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<T> {
  const { token, ...rest } = init ?? {};

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Request failed.");
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
