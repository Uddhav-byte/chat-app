-- ==============================================================================
-- NEXUS CHAT: Supabase PostgreSQL Schema & Realtime Setup
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Profiles Table (mirrors auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text default '',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Automatic Profile Creation on Signup Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Create Rooms Table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text default '',
  is_private boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Create Room Members Table
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default timezone('utc'::text, now()) not null,
  unique (room_id, user_id)
);

-- 6. Create Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  type text default 'text' check (type in ('text', 'system')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Index for speedy message retrieval per room
create index if not exists idx_messages_room_id_created_at
  on public.messages (room_id, created_at asc);

-- 7. Seed Initial Default Rooms
insert into public.rooms (name, description)
values 
  ('General', 'Welcome to Nexus Chat! Drop a hello.'),
  ('Tech Talk', 'Discuss development, frameworks, and architecture.'),
  ('Random', 'Memes, chill vibes, and random discussions.')
on conflict (name) do nothing;

-- 8. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;

-- Policies: Profiles
create policy "Public profiles are viewable by all authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Policies: Rooms
create policy "Rooms are viewable by authenticated users"
  on public.rooms for select
  to authenticated
  using (true);

create policy "Authenticated users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = created_by or created_by is null);

-- Policies: Room Members
create policy "Room members are viewable by authenticated users"
  on public.room_members for select
  to authenticated
  using (true);

create policy "Authenticated users can join rooms"
  on public.room_members for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policies: Messages
create policy "Messages are readable by authenticated users"
  on public.messages for select
  to authenticated
  using (true);

create policy "Authenticated users can post messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- 9. Enable Realtime Publications
-- Note: Ensures Supabase broadcasts postgres changes for messages and rooms
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.profiles;
