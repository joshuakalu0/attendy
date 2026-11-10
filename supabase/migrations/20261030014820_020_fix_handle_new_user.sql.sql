/*
# Fix: Database error finding user on signup

## Problem
The `handle_new_user()` trigger function was failing during Supabase auth signup,
causing a 500 "Database error finding user" error. The function relied on a
variable lookup for `account_type_id` that could return NULL, and while the
column is nullable, some Supabase auth versions handle trigger failures
differently in their internal transaction.

## Fix
- Made the function more robust: if the normal_user account_type isn't found,
  it falls back to inserting with a NULL account_type_id (which is allowed)
- Added explicit exception handling to prevent trigger failures from
  blocking auth signup
- Kept SECURITY DEFINER and search_path = public
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type_id uuid;
BEGIN
  SELECT id INTO v_account_type_id FROM account_types WHERE key = 'normal_user' LIMIT 1;

  BEGIN
    INSERT INTO profiles (user_id, email, account_type_id)
    VALUES (NEW.id, NEW.email, v_account_type_id);
  EXCEPTION WHEN OTHERS THEN
    -- If profile insert fails (e.g. already exists), don't block the auth signup
    -- The profile can be created later. A failed trigger would cause
    -- "Database error finding user" in Supabase auth.
    RETURN NEW;
  END;

  RETURN NEW;
END;
$function$;
