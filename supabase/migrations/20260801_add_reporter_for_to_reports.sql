-- Stores whether the reporter is reporting an incident about themselves or another student.
-- This is intentionally idempotent so it can be safely applied to existing projects.
alter table public.reports
  add column if not exists reporter_for varchar(20) not null default 'self';

alter table public.reports
  drop constraint if exists reports_reporter_for_check;

alter table public.reports
  add constraint reports_reporter_for_check
  check (reporter_for in ('self', 'other'));
