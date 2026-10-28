
-- SMART RESERVE DATABASE SCHEMA
-- College facility booking system

create extension if not exists btree_gist with schema extensions;

-- 1. Facilities: rooms, courts and other bookable spaces
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  purpose text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (end_time > start_time)
);

-- Prevent overlapping active bookings for the same facility.
-- This also protects against two people booking simultaneously.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    facility_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status = 'confirmed');

create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_facility_start_idx
  on public.bookings (facility_id, start_time);

-- 3. Waitlist: users waiting for a facility and time slot
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  purpose text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'notified', 'booked', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (facility_id, user_id, start_time, end_time)
);

create index waitlist_slot_idx
  on public.waitlist (facility_id, start_time, end_time, created_at);

-- 4. Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  waitlist_id uuid references public.waitlist(id) on delete set null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Enable row-level security
alter table public.facilities enable row level security;
alter table public.bookings enable row level security;
alter table public.waitlist enable row level security;
alter table public.notifications enable row level security;

-- Facilities: anyone can see active facilities
create policy "Anyone can view active facilities"
  on public.facilities
  for select to anon, authenticated
  using (is_active = true);

-- Bookings: signed-in users can view confirmed bookings
-- and their own cancelled bookings
create policy "Users can view bookings"
  on public.bookings
  for select to authenticated
  using (status = 'confirmed' or (select auth.uid()) = user_id);

-- Users can create bookings only for themselves
create policy "Users can create their own bookings"
  on public.bookings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Users can cancel their own bookings but cannot change ownership
-- or edit booking details through a direct update
create policy "Users can cancel their own bookings"
  on public.bookings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and status = 'cancelled'
  );

-- Waitlist: users can view and manage their own entries
create policy "Users can view their own waitlist"
  on public.waitlist
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can join their own waitlist"
  on public.waitlist
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can cancel their own waitlist entries"
  on public.waitlist
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and status = 'cancelled'
  );

-- Notifications: users can only read and mark their own notifications
create policy "Users can view their own notifications"
  on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can mark their own notifications as read"
  on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
  );

-- Direct client writes to notifications are not permitted.
revoke insert, delete on public.notifications from anon, authenticated;
