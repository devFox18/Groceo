-- Enable extensions required for UUID generation
create extension if not exists "pgcrypto";

-- Households table
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Members table
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, household_id)
);

-- Lists table
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  category text,
  quantity int not null default 1,
  price_estimate numeric,
  checked boolean not null default false,
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Indexes for faster lookups
create index if not exists idx_members_user on public.members (user_id);
create index if not exists idx_members_household on public.members (household_id);
create index if not exists idx_lists_household on public.lists (household_id);
create index if not exists idx_items_list on public.items (list_id);

-- Enable Row Level Security
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.lists enable row level security;
alter table public.items enable row level security;

-- Helper expression to check membership
create or replace view public.user_household_membership as
select m.user_id, m.household_id, m.role
from public.members m;

-- Policies for households
create policy if not exists households_select
  on public.households
  for select
  using (
    exists (
      select 1 from public.members m
      where m.household_id = households.id and m.user_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

create policy if not exists households_insert
  on public.households
  for insert
  with check (owner_id = auth.uid());

create policy if not exists households_update
  on public.households
  for update
  using (owner_id = auth.uid());

create policy if not exists households_delete
  on public.households
  for delete
  using (owner_id = auth.uid());

-- Policies for members
create policy if not exists members_select
  on public.members
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.households h
      where h.id = members.household_id and h.owner_id = auth.uid()
    )
  );

create policy if not exists members_insert
  on public.members
  for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

create policy if not exists members_delete
  on public.members
  for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.households h
      where h.id = members.household_id and h.owner_id = auth.uid()
    )
  );

-- Policies for lists
create policy if not exists lists_crud
  on public.lists
  for all
  using (
    exists (
      select 1 from public.members m
      where m.household_id = lists.household_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.household_id = lists.household_id and m.user_id = auth.uid()
    )
  );

-- Policies for items
create policy if not exists items_crud
  on public.items
  for all
  using (
    exists (
      select 1 from public.lists l
      join public.members m on m.household_id = l.household_id
      where l.id = items.list_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      join public.members m on m.household_id = l.household_id
      where l.id = items.list_id and m.user_id = auth.uid()
    )
  );

-- Optional seed data for local development
-- uncomment and adjust the auth uid before running locally.
/*
with current_user as (
  select auth.uid() as user_id
)
insert into public.households (name, owner_id)
select 'My First Household', user_id from current_user
on conflict do nothing;

insert into public.members (user_id, household_id, role)
select
  current_user.user_id,
  h.id,
  'owner'
from current_user
join public.households h on h.owner_id = current_user.user_id
on conflict do nothing;

insert into public.lists (household_id, name)
select h.id, 'Weekly groceries'
from public.households h
where h.name = 'My First Household'
on conflict do nothing;

insert into public.items (list_id, name, quantity)
select l.id, item_name, qty
from public.lists l,
     (values ('Milk', 2), ('Bread', 1)) as seed(item_name, qty)
where l.name = 'Weekly groceries'
on conflict do nothing;
*/
