-- Function to automatically promote students from Year 11 to Year 12 after one year
create or replace function public.promote_year_level()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update students who are currently Year 11 and have been enrolled for at least 1 year
  update public.profiles
  set year_level = '12'::year_level_enum,
      updated_at = now()
  where year_level = '11'::year_level_enum
    and created_at <= now() - interval '1 year'
    and is_verified = true;

  -- Log the promotion (optional - you can remove this if not needed)
  -- You could create a separate table to track promotions if desired
end;
$$;

-- Create a comment for the function
comment on function public.promote_year_level() is 'Automatically promotes Year 11 students to Year 12 after one year of enrollment';

-- Optional: Create a scheduled job using pg_cron (if available)
-- Note: pg_cron needs to be installed separately in Supabase
-- This would run the promotion function daily at midnight
-- select cron.schedule('year-level-promotion', '0 0 * * *', 'select public.promote_year_level();');