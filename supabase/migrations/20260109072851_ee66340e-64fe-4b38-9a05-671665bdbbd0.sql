-- Update handle_new_user() to automatically assign team_member role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), NEW.email);
  
  -- Auto-assign team_member role (admins create users via AddMember which handles role assignment)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;