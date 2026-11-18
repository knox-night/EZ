create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  tester_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null check (length(trim(company_name)) between 1 and 120),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null check (length(trim(description)) between 1 and 1000),
  product_url text not null check (product_url ~ '^https://'),
  target_audience text not null check (length(trim(target_audience)) between 1 and 1000),
  testing_task text not null check (length(trim(testing_task)) between 1 and 3000),
  desired_feedback text not null check (length(trim(desired_feedback)) between 1 and 3000),
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  reward_credits integer not null check (reward_credits > 0),
  spots_total integer not null check (spots_total > 0),
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.mission_applications (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  tester_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (mission_id, tester_id),
  unique (id, mission_id, tester_id)
);

create table if not exists public.mission_invitations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  tester_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (mission_id, tester_id)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  application_id uuid not null,
  tester_id uuid not null references auth.users (id) on delete cascade,
  feedback text not null check (length(trim(feedback)) > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  foreign key (application_id, mission_id, tester_id)
    references public.mission_applications (id, mission_id, tester_id) on delete cascade,
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('earn', 'spend', 'expire', 'adjust')),
  amount integer not null check (amount <> 0),
  source_submission_id uuid references public.submissions (id),
  source_mission_id uuid references public.missions (id),
  source_ledger_entry_id bigint references public.credit_ledger (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  check (
    (entry_type = 'earn' and amount > 0 and source_submission_id is not null
      and expires_at is not null and expires_at = created_at + interval '12 months')
    or (entry_type = 'spend' and amount < 0 and source_mission_id is not null and expires_at is null)
    or (entry_type = 'expire' and amount < 0 and expires_at is null and source_ledger_entry_id is not null)
    or (entry_type = 'adjust' and expires_at is null)
  )
);

create unique index if not exists credit_ledger_one_earn_per_submission
  on public.credit_ledger (source_submission_id)
  where entry_type = 'earn' and source_submission_id is not null;

create unique index if not exists credit_ledger_one_expiration_per_earn
  on public.credit_ledger (source_ledger_entry_id)
  where entry_type = 'expire' and source_ledger_entry_id is not null;

create index if not exists missions_founder_created_at_idx
  on public.missions (founder_id, created_at desc);
create index if not exists missions_open_created_at_idx
  on public.missions (created_at desc) where status = 'open';
create index if not exists applications_tester_status_idx
  on public.mission_applications (tester_id, status);
create index if not exists invitations_tester_status_idx
  on public.mission_invitations (tester_id, status);
create index if not exists submissions_mission_status_idx
  on public.submissions (mission_id, status);
create index if not exists credit_ledger_user_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_applications enable row level security;
alter table public.mission_invitations enable row level security;
alter table public.submissions enable row level security;
alter table public.credit_ledger enable row level security;

revoke all on public.profiles, public.missions, public.mission_applications,
  public.mission_invitations, public.submissions, public.credit_ledger from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.missions to authenticated;
grant select on public.missions to anon;
grant select on public.mission_applications to authenticated;
grant insert (mission_id, tester_id) on public.mission_applications to authenticated;
grant update (status) on public.mission_applications to authenticated;
grant select on public.mission_invitations to authenticated;
grant insert (mission_id, tester_id, invited_by) on public.mission_invitations to authenticated;
grant update (status, responded_at) on public.mission_invitations to authenticated;
grant select on public.submissions to authenticated;
grant insert (mission_id, application_id, tester_id, feedback) on public.submissions to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.submissions to authenticated;
grant select on public.credit_ledger to authenticated;

create policy "Users manage their own profiles"
  on public.profiles for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Anyone can view open missions"
  on public.missions for select to anon, authenticated
  using (status = 'open');

create policy "Founders can view their missions"
  on public.missions for select to authenticated
  using (founder_id = auth.uid());

create policy "Founders create their own missions"
  on public.missions for insert to authenticated
  with check (founder_id = auth.uid());

create policy "Founders update their own missions"
  on public.missions for update to authenticated
  using (founder_id = auth.uid())
  with check (founder_id = auth.uid());

create policy "Founders delete their own missions"
  on public.missions for delete to authenticated
  using (founder_id = auth.uid());

create policy "Testers and founders view applications"
  on public.mission_applications for select to authenticated
  using (
    tester_id = auth.uid()
    or exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
  );

create policy "Testers apply as themselves"
  on public.mission_applications for insert to authenticated
  with check (
    tester_id = auth.uid()
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.status = 'open' and m.founder_id <> auth.uid()
    )
  );

create policy "Founders review applications"
  on public.mission_applications for update to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
  );

create policy "Testers and founders view invitations"
  on public.mission_invitations for select to authenticated
  using (
    tester_id = auth.uid()
    or exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
  );

create policy "Founders invite other testers"
  on public.mission_invitations for insert to authenticated
  with check (
    invited_by = auth.uid()
    and tester_id <> auth.uid()
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid() and m.status = 'open'
    )
  );

create policy "Testers respond to their invitations"
  on public.mission_invitations for update to authenticated
  using (tester_id = auth.uid() and status = 'invited')
  with check (
    tester_id = auth.uid()
    and status in ('accepted', 'declined')
    and responded_at is not null
  );

create policy "Testers and founders view submissions"
  on public.submissions for select to authenticated
  using (
    tester_id = auth.uid()
    or exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
  );

create policy "Accepted testers submit their feedback"
  on public.submissions for insert to authenticated
  with check (
    tester_id = auth.uid()
    and exists (
      select 1
      from public.mission_applications a
      join public.missions m on m.id = a.mission_id
      where a.id = application_id
        and a.mission_id = mission_id
        and a.tester_id = auth.uid()
        and a.status = 'accepted'
        and m.status = 'open'
        and m.founder_id <> auth.uid()
    )
  );

create policy "Founders review submissions for their missions"
  on public.submissions for update to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.founder_id = auth.uid()
    )
    and reviewed_by = auth.uid()
  );

create policy "Users view only their own credit entries"
  on public.credit_ledger for select to authenticated
  using (user_id = auth.uid());
