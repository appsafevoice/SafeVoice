-- Create enum type for year level if it doesn't exist
do $$ begin
  create type year_level_enum as enum ('11', '12');
exception when duplicate_object then null;
end $$;

-- Add year_level column to profiles table using enum
alter table if exists public.profiles
add column if not exists year_level year_level_enum;

-- Add comment to explain the column
comment on column public.profiles.year_level is 'Student year level: 11 or 12';