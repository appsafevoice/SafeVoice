-- Create enum type for gender if it doesn't exist
do $$ begin
  create type gender_enum as enum ('male', 'female');
exception when duplicate_object then null;
end $$;

-- Add gender column to profiles table using enum
alter table if exists public.profiles
add column if not exists gender gender_enum;

-- Add comment to explain the column
comment on column public.profiles.gender is 'Student gender: male or female';
