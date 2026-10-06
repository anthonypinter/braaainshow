-- Braaainshow!?: one-time Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

-- 1. Table for saved madlibs + recordings -------------------------------
create table if not exists public.recordings (
  id          uuid primary key,
  template_id text        not null,
  title       text        not null,
  name        text        not null check (char_length(name) between 1 and 80),
  email       text        not null check (char_length(email) between 3 and 254),
  words       jsonb       not null,   -- { "adj1": "squishy", ... }
  lines       jsonb       not null,   -- ["Welcome aboard the most squishy...", ...]
  video_path  text        not null,   -- path inside the "videos" bucket
  created_at  timestamptz not null default now()
);

alter table public.recordings enable row level security;

-- The website (anonymous visitors) may ADD rows, but may NOT read the table.
-- That keeps emails private and stops anyone from listing every recording.
grant usage on schema public to anon;
grant insert on public.recordings to anon;

drop policy if exists "anyone can insert" on public.recordings;
create policy "anyone can insert"
  on public.recordings for insert to anon
  with check (true);

-- 2. Lookup function for the watch page ---------------------------------
-- Returns ONE recording by id, without the email column.
create or replace function public.get_recording(rid uuid)
returns table (
  id uuid, title text, name text, lines jsonb, video_path text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.title, r.name, r.lines, r.video_path, r.created_at
  from public.recordings r
  where r.id = rid;
$$;

revoke all on function public.get_recording(uuid) from public;
grant execute on function public.get_recording(uuid) to anon;

-- 3. Storage bucket for videos ------------------------------------------
-- Public = anyone with the link can watch. 50 MB cap (Supabase free plan max).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Visitors may upload new videos, but not overwrite, delete, or list them.
drop policy if exists "anyone can upload videos" on storage.objects;
create policy "anyone can upload videos"
  on storage.objects for insert to anon
  with check (bucket_id = 'videos');
