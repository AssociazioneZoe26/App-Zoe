revoke all on function public.sync_newsletter_from_profile() from public, anon, authenticated;
grant execute on function public.sync_newsletter_from_profile() to postgres, service_role, supabase_admin;
