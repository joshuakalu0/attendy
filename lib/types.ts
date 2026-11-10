export type AccountTypeKey = 'super_admin' | 'enterprise' | 'normal_user';

export type WorkspaceType = 'personal' | 'enterprise';

export interface Workspace {
  type: WorkspaceType;
  enterprise_id?: string;
  label: string;
  role_name?: string;
  is_owner?: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: string;
  account_type: AccountTypeKey | null;
  account_type_label: string | null;
  dashboard_route: string | null;
  two_factor_enabled: boolean;
  notification_prefs: Record<string, boolean>;
  theme: string;
  language: string;
  timezone: string;
  created_at: string;
}

export interface UserEnterprise {
  enterprise_id: string;
  role_id: string;
  role_name: string;
  membership_id: string;
  status: string;
  department_id: string | null;
  is_owner: boolean;
}

export interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  enterprises: UserEnterprise[];
  permissions: string[];
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
  badge?: string;
}

export interface ModuleRegistryEntry {
  key: string;
  label: string;
  href: string;
  icon: string;
  requiredPermission: string;
  requiresActiveSubscription: boolean;
}
