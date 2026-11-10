import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          account_type_id: string | null;
          status: string;
          two_factor_enabled: boolean;
          two_factor_secret: string | null;
          two_factor_recovery_codes: string[];
          notification_prefs: Record<string, boolean>;
          theme: string;
          language: string;
          timezone: string;
          deletion_requested_at: string | null;
          deletion_scheduled_for: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          account_type_id?: string | null;
          status?: string;
          two_factor_enabled?: boolean;
          notification_prefs?: Record<string, boolean>;
          theme?: string;
          language?: string;
          timezone?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      account_types: {
        Row: {
          id: string;
          key: string;
          label: string;
          description: string | null;
          default_role_id: string | null;
          dashboard_route: string;
          onboarding_flow: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['account_types']['Row']>;
        Update: Partial<Database['public']['Tables']['account_types']['Row']>;
      };
      enterprises: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          timezone: string;
          currency: string;
          owner_id: string | null;
          plan_id: string | null;
          subscription_status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['enterprises']['Row']>;
        Update: Partial<Database['public']['Tables']['enterprises']['Row']>;
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          enterprise_id: string;
          role_id: string;
          department_id: string | null;
          status: string;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['memberships']['Row']>;
        Update: Partial<Database['public']['Tables']['memberships']['Row']>;
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_system: boolean;
          enterprise_id: string | null;
          account_type_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['roles']['Row']>;
        Update: Partial<Database['public']['Tables']['roles']['Row']>;
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          label: string;
          description: string | null;
          category: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['permissions']['Row']>;
        Update: Partial<Database['public']['Tables']['permissions']['Row']>;
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['role_permissions']['Row']>;
        Update: Partial<Database['public']['Tables']['role_permissions']['Row']>;
      };
      invites: {
        Row: {
          id: string;
          enterprise_id: string;
          email: string;
          role_id: string;
          invited_by: string;
          token: string;
          status: string;
          department_id: string | null;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['invites']['Row']>;
        Update: Partial<Database['public']['Tables']['invites']['Row']>;
      };
      departments: {
        Row: {
          id: string;
          enterprise_id: string;
          name: string;
          description: string | null;
          head_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['departments']['Row']>;
        Update: Partial<Database['public']['Tables']['departments']['Row']>;
      };
      department_members: {
        Row: {
          id: string;
          department_id: string;
          user_id: string;
          enterprise_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['department_members']['Row']>;
        Update: Partial<Database['public']['Tables']['department_members']['Row']>;
      };
      audit_logs: {
        Row: {
          id: string;
          enterprise_id: string | null;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
          impersonated_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Record<string, unknown>;
          read: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notifications']['Row']>;
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          interval: string;
          max_employees: number | null;
          features: Record<string, unknown>;
          is_active: boolean;
          sort_order: number;
          paystack_plan_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['plans']['Row']>;
        Update: Partial<Database['public']['Tables']['plans']['Row']>;
      };
      subscriptions: {
        Row: {
          id: string;
          enterprise_id: string | null;
          user_id: string | null;
          plan_id: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          canceled_at: string | null;
          trial_end: string | null;
          paystack_subscription_code: string | null;
          paystack_customer_code: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']>;
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
      };
      payments: {
        Row: {
          id: string;
          enterprise_id: string | null;
          user_id: string | null;
          subscription_id: string | null;
          plan_id: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          paystack_reference: string | null;
          paystack_transaction_id: string | null;
          paystack_response: Record<string, unknown>;
          invoice_url: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payments']['Row']>;
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          device_name: string | null;
          device_type: string | null;
          ip_address: string | null;
          user_agent: string | null;
          location: string | null;
          is_current: boolean;
          is_revoked: boolean;
          last_active_at: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['sessions']['Row']>;
        Update: Partial<Database['public']['Tables']['sessions']['Row']>;
      };
    };
  };
};
