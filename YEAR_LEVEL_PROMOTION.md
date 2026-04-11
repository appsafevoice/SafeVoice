# Year Level Promotion System

## Overview

The SafeVoice application includes an automatic year level promotion system that advances students from Year 11 to Year 12 after one year of enrollment.

## How It Works

- Students select their year level (11 or 12) during signup
- After exactly one year from their account creation date, Year 11 students are automatically promoted to Year 12
- Year 12 students remain at Year 12 (no further promotion)
- Only verified students are eligible for promotion

## Manual Promotion

To run the year level promotion manually:

```bash
# Using npm script
npm run promote-year-level

# Or directly with node
node scripts/promote-year-level.js
```

## Requirements

The promotion script requires these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Changes

The system uses:
- `year_level_enum` type with values '11' and '12'
- `year_level` column in the `profiles` table
- Automatic promotion based on `created_at` timestamp

## Scheduling

For production use, set up a cron job to run the promotion script daily:

```bash
# Example crontab entry (runs daily at midnight)
0 0 * * * cd /path/to/safevoice && npm run promote-year-level
```

## Admin Interface

Year levels are displayed in the Admin Account Management interface, showing the current year level for each student.