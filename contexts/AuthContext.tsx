import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/lib/query-client';

const AUTH_TOKEN_KEY = 'nyluver_auth_token';
const AUTH_USER_KEY = 'nyluver_auth_user';

interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  points?: number;
}

interface AuthContextValue {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, phone: string) => Promise<{ error?: string }>;
  sendSignUpOtp: (name: string, email: string, phone: string) => Promise<{ error?: string; phone?: string; devCode?: string }>;
  verifySignUp: (name: string, email: string, phone: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);
        if (savedToken && savedUser && mounted) {
          const parsedUser = JSON.parse(savedUser) as AppUser;
          setToken(savedToken);
          setUser(parsedUser);
          try {
            const baseUrl = getApiUrl();
            const res = await fetch(new URL('/api/auth/me', baseUrl).toString(), {
              headers: { 'Authorization': `Bearer ${savedToken}` },
            });
            if (res.ok) {
              const freshUser = await res.json();
              if (mounted) setUser(freshUser);
              await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
            }
          } catch {}
        }
      } catch (e) {
        console.error('Auth restore error:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async (email: string, phone: string): Promise<{ error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/auth/login', baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'no_match') {
          return { error: 'No account found with that email and phone number' };
        }
        if (data.error === 'blocked') {
          return { error: 'This account has been suspended' };
        }
        return { error: data.message || 'Login failed' };
      }
      setUser(data.user);
      setToken(data.token);
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)),
      ]);
      return {};
    } catch (e: any) {
      return { error: e.message || 'Connection error' };
    }
  }, []);

  const sendSignUpOtp = useCallback(async (name: string, email: string, phone: string): Promise<{ error?: string; phone?: string; devCode?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/auth/register/send-otp', baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'email_taken') {
          return { error: 'An account with this email already exists' };
        }
        if (data.error === 'phone_taken') {
          return { error: 'An account with this phone number already exists' };
        }
        return { error: data.message || 'Failed to send verification code' };
      }
      return { phone: data.phone, devCode: data.devCode };
    } catch (e: any) {
      return { error: e.message || 'Connection error' };
    }
  }, []);

  const verifySignUp = useCallback(async (name: string, email: string, phone: string, code: string): Promise<{ error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/auth/register/verify', baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'invalid_otp') {
          return { error: 'Invalid or expired verification code' };
        }
        if (data.error === 'email_taken') {
          return { error: 'An account with this email already exists' };
        }
        if (data.error === 'phone_taken') {
          return { error: 'An account with this phone number already exists' };
        }
        return { error: data.message || 'Verification failed' };
      }
      setUser(data.user);
      setToken(data.token);
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)),
      ]);
      return {};
    } catch (e: any) {
      return { error: e.message || 'Connection error' };
    }
  }, []);

  const signOutFn = useCallback(async () => {
    setUser(null);
    setToken(null);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    signIn,
    sendSignUpOtp,
    verifySignUp,
    signOut: signOutFn,
  }), [user, token, isLoading, signIn, sendSignUpOtp, verifySignUp, signOutFn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
