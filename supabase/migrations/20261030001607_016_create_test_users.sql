/*
# Create Test Users

## Overview
Creates two test accounts for development and testing:
1. A normal (lite) user — testuser@attendance.app / Test1234
2. An enterprise owner — testenterprise@attendance.app / Test1234

## Notes
- Inserts directly into auth.users with bcrypt-hashed passwords
- Creates profiles with appropriate account_type
- Creates enterprise + owner membership for the enterprise user
- Idempotent: checks existence before inserting
*/

DO $$
DECLARE
  v_normal_id uuid;
  v_ent_id uuid;
  v_normal_type_id uuid := '1f02c8b1-03c6-4376-bf3e-dbd640e2bf44';
  v_ent_type_id uuid := '282b1b75-830d-4d31-836e-687ddc431971';
  v_enterprise_id uuid;
  v_owner_role_id uuid;
BEGIN
  -- Check if normal test user exists
  SELECT id INTO v_normal_id FROM auth.users WHERE email = 'testuser@attendance.app';
  IF v_normal_id IS NULL THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'testuser@attendance.app', crypt('Test1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Test User"}'::jsonb, false)
    RETURNING id INTO v_normal_id;
  END IF;

  -- Check if enterprise test user exists
  SELECT id INTO v_ent_id FROM auth.users WHERE email = 'testenterprise@attendance.app';
  IF v_ent_id IS NULL THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'testenterprise@attendance.app', crypt('Test1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Test Enterprise"}'::jsonb, false)
    RETURNING id INTO v_ent_id;
  END IF;

  -- Create profile for normal user if not exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = v_normal_id) THEN
    INSERT INTO profiles (user_id, email, full_name, account_type_id, status, two_factor_enabled, notification_prefs, theme, language, timezone)
    VALUES (v_normal_id, 'testuser@attendance.app', 'Test User', v_normal_type_id, 'active', false, '{}'::jsonb, 'system', 'en', 'UTC');
  END IF;

  -- Create profile for enterprise user if not exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = v_ent_id) THEN
    INSERT INTO profiles (user_id, email, full_name, account_type_id, status, two_factor_enabled, notification_prefs, theme, language, timezone)
    VALUES (v_ent_id, 'testenterprise@attendance.app', 'Test Enterprise', v_ent_type_id, 'active', false, '{}'::jsonb, 'system', 'en', 'UTC');
  END IF;

  -- Create enterprise if not exists
  SELECT id INTO v_enterprise_id FROM enterprises WHERE owner_id = v_ent_id;
  IF v_enterprise_id IS NULL THEN
    INSERT INTO enterprises (name, owner_id, subscription_status, timezone, currency, is_active)
    VALUES ('Test Enterprise Inc.', v_ent_id, 'active', 'UTC', 'USD', true)
    RETURNING id INTO v_enterprise_id;
  END IF;

  -- Get owner role
  SELECT id INTO v_owner_role_id FROM roles WHERE is_system = true AND name = 'Owner' LIMIT 1;

  -- Create membership if not exists
  IF v_owner_role_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM memberships WHERE enterprise_id = v_enterprise_id AND user_id = v_ent_id) THEN
    INSERT INTO memberships (enterprise_id, user_id, role_id, status, joined_at)
    VALUES (v_enterprise_id, v_ent_id, v_owner_role_id, 'active', now());
  END IF;
END $$;
