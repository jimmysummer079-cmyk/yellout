import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'yellout_session_token';
const CODENAME_KEY = 'yellout_codename';
const ONBOARDING_KEY = 'yellout_onboarding_done';

/** Web fallback when SecureStore is unavailable (Expo web). */
const memory = new Map<string, string>();

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getStoredToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getStoredCodename(): Promise<string | null> {
  return getItem(CODENAME_KEY);
}

export async function setStoredSession(token: string, codename: string) {
  await setItem(TOKEN_KEY, token);
  await setItem(CODENAME_KEY, codename);
}

export async function clearStoredSession() {
  await deleteItem(TOKEN_KEY);
  await deleteItem(CODENAME_KEY);
}

export async function isOnboardingDone(): Promise<boolean> {
  return (await getItem(ONBOARDING_KEY)) === '1';
}

export async function markOnboardingDone() {
  await setItem(ONBOARDING_KEY, '1');
}
