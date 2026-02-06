/**
 * Stub CDP hooks when @coinbase/cdp-hooks is not installed or VITE_USE_CDP is not set.
 * Provides signed-out state so the app builds and runs without CDP. Set VITE_USE_CDP=true for real CDP.
 */

const noop = async () => {};
const noopSync = () => {};

export function useIsInitialized() {
  return { isInitialized: true };
}

export function useIsSignedIn() {
  return { isSignedIn: false };
}

export function useSignOut() {
  return { signOut: noop };
}

export function useCurrentUser() {
  return { currentUser: undefined };
}

export function useSignInWithEmail() {
  return { signInWithEmail: noop, isLoading: false, error: undefined };
}

export function useVerifyEmailOTP() {
  return { verifyOtp: noop, isLoading: false, error: undefined };
}

export function useSignInWithSms() {
  return { signInWithSms: noop, isLoading: false, error: undefined };
}

export function useVerifySmsOTP() {
  return { verifyOtp: noop, isLoading: false, error: undefined };
}

export function useSignInWithOAuth() {
  return { signInWithOAuth: noopSync, isLoading: false, error: undefined };
}

export type OAuth2ProviderType = string;
