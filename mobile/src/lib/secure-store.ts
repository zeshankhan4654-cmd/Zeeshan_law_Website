import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Where the session token lives between launches.
 *
 * On a handset this is the platform keychain — Keychain Services on iOS, the
 * Keystore-backed EncryptedSharedPreferences on Android. A token there is
 * encrypted at rest and readable only by this app, which is the whole reason
 * the mobile app carries a bearer token at all instead of trying to imitate
 * the web's httpOnly cookie.
 *
 * expo-secure-store has no web implementation and throws if called there, so
 * the web target falls back to localStorage. That is a genuinely weaker
 * store — readable by any script on the origin — and is only ever used by
 * `expo start --web` during development, never by a shipped build.
 */
const webStore = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode, or storage disabled — the session just won't persist */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* as above */
    }
  },
};

const isWeb = Platform.OS === "web";

export async function readSecure(key: string): Promise<string | null> {
  if (isWeb) return webStore.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // A corrupt or unreadable keychain entry should present as "not signed
    // in", not as a crash on launch.
    return null;
  }
}

export async function writeSecure(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStore.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  if (isWeb) {
    webStore.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* already gone */
  }
}
