/*
# Seed Sample Plans

## Overview
Seeds three subscription plans: Free, Pro, and Enterprise.

## Seeded Data
1. Free - $0/month, max 5 employees
2. Pro - $49/month, max 50 employees
3. Enterprise - $199/month, unlimited employees
*/

INSERT INTO plans (name, description, price_cents, currency, interval, max_employees, features, is_active, sort_order) VALUES
  ('Free', 'Get started with basic features', 0, 'USD', 'monthly', 5, '{"core_module":true,"audit_log":false,"custom_roles":false}'::jsonb, true, 1),
  ('Pro', 'Professional plan for growing teams', 4900, 'USD', 'monthly', 50, '{"core_module":true,"audit_log":true,"custom_roles":true}'::jsonb, true, 2),
  ('Enterprise', 'Enterprise plan with unlimited seats', 19900, 'USD', 'monthly', NULL, '{"core_module":true,"audit_log":true,"custom_roles":true,"priority_support":true}'::jsonb, true, 3)
ON CONFLICT DO NOTHING;
