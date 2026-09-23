import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminUser, Role } from '../types';
import { seedUsers } from '../data/seed';
import { DEMO_CREDS } from '../config/constants';
import { env } from '../config/env';
import { request, setAccessToken } from '../lib/http';

/**
 * Sign-in, in two modes.
 *
 * VITE_USE_MOCKS=true keeps the original offline demo login, so the
 * mock-backed CMS screens still work with no backend running.
 *
 * VITE_USE_MOCKS=false authenticates against the real API. The Home Page
 * screens always call the real API, so they need this mode - the access token
 * set here is what lib/http.ts attaches to every request.
 */

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);
const STORAGE_KEY = 'upwon.admin.user';

/** The authenticated admin as /auth/login and /auth/me return it. */
interface AuthenticatedAdminDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
  lastLoginAt: string | null;
}

interface LoginResultDto {
  accessToken: string;
  admin: AuthenticatedAdminDto;
}

/**
 * The backend has one seeded role (ADMIN) plus any custom role created at
 * runtime; this panel still models three. ADMIN maps to admin and anything
 * else lands on editor, which is the safe middle: it never grants more than
 * the backend allows, since the backend re-checks permissions on every call.
 */
function toRole(roles: string[]): Role {
  return roles.includes('ADMIN') ? 'admin' : 'editor';
}

function toAdminUser(admin: AuthenticatedAdminDto): AdminUser {
  const now = new Date().toISOString();
  return {
    id: admin.id,
    name: admin.fullName,
    email: admin.email,
    role: toRole(admin.roles),
    active: admin.status === 'ACTIVE',
    lastLoginAt: admin.lastLoginAt ?? undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      /*
       * Real mode: the stored user is only a cache. The access token is what
       * actually authorises, so it is revalidated against /auth/me before the
       * panel trusts it - an expired one triggers the refresh in lib/http.
       */
      if (!env.useMocks) {
        /*
         * Note there is no "no access token means signed out" shortcut here.
         *
         * The refresh cookie outlives the access token by a long way, and it
         * lives in an httpOnly cookie this code cannot read - so the absence of
         * an access token says nothing about whether the session is still good.
         * It is simply missing whenever localStorage was cleared, or the dev
         * server moved to a different port (localStorage is keyed by origin,
         * port included), or a previous refresh failed.
         *
         * Calling /auth/me regardless costs one 401 in that case, which the
         * interceptor in lib/http turns into a refresh and a retry. Bailing out
         * early instead is what logs a still-valid session out.
         */
        try {
          const admin = await request<AuthenticatedAdminDto>('/auth/me');
          if (cancelled) return;
          const mapped = toAdminUser(admin);
          setUser(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch {
          if (!cancelled) {
            setAccessToken(null);
            localStorage.removeItem(STORAGE_KEY);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!env.useMocks) {
      const result = await request<LoginResultDto>('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });
      setAccessToken(result.accessToken);
      const mapped = toAdminUser(result.admin);
      setUser(mapped);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      return;
    }

    await new Promise((r) => setTimeout(r, 350));
    const ok = email.trim().toLowerCase() === DEMO_CREDS.email && password === DEMO_CREDS.password;
    if (!ok) {
      const fallback = seedUsers.find((u) => u.email === email.trim().toLowerCase());
      if (!fallback) throw new Error('Invalid email or password.');
      setUser(fallback);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      return;
    }
    const u = seedUsers[0];
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    // Cleared locally first: the session must end in this tab even if the
    // round trip that revokes the refresh token fails.
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    if (!env.useMocks) {
      setAccessToken(null);
      void request('/auth/logout', { method: 'POST' }).catch(() => {
        /* already signed out locally */
      });
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
