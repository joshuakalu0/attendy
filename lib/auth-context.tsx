'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type {
  AuthContextValue,
  UserProfile,
  UserEnterprise,
  Workspace,
} from '@/lib/types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'active_workspace';

function loadStoredWorkspace(): Workspace | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Workspace;
  } catch {
    return null;
  }
}

function storeWorkspace(ws: Workspace | null) {
  if (typeof window === 'undefined') return;
  if (ws) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [enterprises, setEnterprises] = useState<UserEnterprise[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvePermissions = useCallback(async (ws: Workspace | null) => {
    if (!ws || ws.type === 'personal') {
      // Personal workspace: use global permissions (account-type defaults)
      const { data } = await supabase.rpc('get_user_permissions');
      setPermissions(data as string[] || []);
    } else if (ws.enterprise_id) {
      const { data } = await supabase.rpc('get_user_permissions_for_enterprise', {
        p_enterprise_id: ws.enterprise_id,
      });
      setPermissions(data as string[] || []);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const [profileRes, enterpriseRes, workspacesRes] = await Promise.all([
        supabase.rpc('get_user_profile').maybeSingle(),
        supabase.rpc('get_user_enterprise'),
        supabase.rpc('get_user_workspaces'),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as unknown as UserProfile);
      }
      if (enterpriseRes.data) {
        const entData = enterpriseRes.data as unknown as UserEnterprise[];
        setEnterprises(entData || []);
      }

      // Build workspaces list
      const wsData = workspacesRes.data as {
        personal: { type: string; label: string };
        enterprises: Array<{
          type: string; enterprise_id: string; label: string;
          role_name: string; is_owner: boolean;
        }>;
      } | null;

      const wsList: Workspace[] = [];
      if (wsData?.personal) {
        wsList.push({ type: 'personal', label: wsData.personal.label });
      }
      if (wsData?.enterprises) {
        for (const e of wsData.enterprises) {
          wsList.push({
            type: 'enterprise',
            enterprise_id: e.enterprise_id,
            label: e.label,
            role_name: e.role_name,
            is_owner: e.is_owner,
          });
        }
      }
      setWorkspaces(wsList);

      // Determine active workspace
      const stored = loadStoredWorkspace();
      let active: Workspace | null = null;

      if (stored) {
        // Validate stored workspace still exists
        const match = wsList.find(
          (w) =>
            w.type === stored.type &&
            (w.type === 'personal' || w.enterprise_id === stored.enterprise_id)
        );
        active = match || null;
      }

      if (!active) {
        // Default: enterprise users go to enterprise workspace, not personal
        const entWs = wsList.find((w) => w.type === 'enterprise');
        active = entWs || wsList[0] || null;
      }

      setActiveWorkspaceState(active);
      storeWorkspace(active);
      await resolvePermissions(active);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, [resolvePermissions]);

  const setActiveWorkspace = useCallback((ws: Workspace) => {
    setActiveWorkspaceState(ws);
    storeWorkspace(ws);
    resolvePermissions(ws);
  }, [resolvePermissions]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await loadUserData();
    }
  }, [loadUserData]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await loadUserData();
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      if (!mounted) return;
      (async () => {
        if (session?.user) {
          setUser(session.user);
          await loadUserData();
        } else {
          setUser(null);
          setProfile(null);
          setEnterprises([]);
          setPermissions([]);
          setWorkspaces([]);
          setActiveWorkspaceState(null);
          storeWorkspace(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  return (
    <AuthContext.Provider
      value={{
        user: user ? { id: user.id, email: user.email || '' } : null,
        profile,
        enterprises,
        permissions,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        loading,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
