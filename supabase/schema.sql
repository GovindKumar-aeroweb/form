-- Step 2: Complete SQL schema
-- Step 3: RLS policies
-- Step 4: Triggers and helper SQL functions

create extension if not exists "uuid-ossp";

-- 1. profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. forms
create table public.forms (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  slug text unique not null,
  is_open boolean not null default true,
  is_public boolean not null default true,
  is_archived boolean not null default false,
  start_date timestamptz,
  end_date timestamptz,
  max_submissions integer,
  one_response_per_user boolean not null default false,
  allow_anonymous boolean not null default true,
  collect_email boolean not null default false,
  notify_owner boolean not null default false,
  success_message text default 'Thank you for your submission.',
  redirect_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. form_fields
create table public.form_fields (
  id uuid primary key default uuid_generate_v4(),
  form_id uuid not null references public.forms(id) on delete cascade,
  type text not null,
  label text not null,
  help_text text,
  placeholder text,
  is_required boolean not null default false,
  order_index integer not null,
  field_key text not null,
  default_value text,
  min_length integer,
  max_length integer,
  min_value numeric,
  max_value numeric,
  regex_pattern text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(form_id, field_key)
);

-- 4. form_field_options
create table public.form_field_options (
  id uuid primary key default uuid_generate_v4(),
  field_id uuid not null references public.form_fields(id) on delete cascade,
  label text not null,
  value text not null,
  order_index integer not null,
  created_at timestamptz not null default now()
);

-- 5. submissions
create table public.submissions (
  id uuid primary key default uuid_generate_v4(),
  form_id uuid not null references public.forms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  submitter_email text,
  ip_hash text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- 6. submission_answers
create table public.submission_answers (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  field_id uuid not null references public.form_fields(id) on delete cascade,
  value jsonb not null,
  created_at timestamptz not null default now()
);

-- 7. audit_logs
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_forms_slug on public.forms(slug);
create index idx_forms_user_id on public.forms(user_id);
create index idx_form_fields_form_id on public.form_fields(form_id);
create index idx_form_field_options_field_id on public.form_field_options(field_id);
create index idx_submissions_form_id on public.submissions(form_id);
create index idx_submissions_created_at on public.submissions(created_at);
create index idx_submission_answers_submission_id on public.submission_answers(submission_id);
create index idx_submission_answers_field_id on public.submission_answers(field_id);

-- Triggers for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles for each row execute procedure update_updated_at_column();
create trigger update_forms_updated_at before update on public.forms for each row execute procedure update_updated_at_column();
create trigger update_form_fields_updated_at before update on public.form_fields for each row execute procedure update_updated_at_column();

-- Auto-create profile trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper function to check if current user is admin (bypasses RLS to prevent recursion)
create or replace function public.is_admin()
returns boolean as $$
declare
  is_admin boolean;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  return coalesce(is_admin, false);
end;
$$ language plpgsql security definer set search_path = public;

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_field_options enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles RLS
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin());
create policy "Admins can update all profiles" on public.profiles for update using (public.is_admin());

-- Forms RLS
create policy "Owner can manage own forms" on public.forms for all using (auth.uid() = user_id);
create policy "Admins can manage all forms" on public.forms for all using (public.is_admin());
create policy "Public can view active public forms" on public.forms for select using (
  is_public = true and is_open = true and is_archived = false
  and (start_date is null or start_date <= now())
  and (end_date is null or end_date >= now())
);

-- Form Fields RLS
create policy "Owner can manage own form fields" on public.form_fields for all using (exists (select 1 from public.forms where id = form_fields.form_id and user_id = auth.uid()));
create policy "Admins can manage all form fields" on public.form_fields for all using (public.is_admin());
create policy "Public can view fields of active public forms" on public.form_fields for select using (
  exists (
    select 1 from public.forms
    where id = form_fields.form_id and is_public = true and is_open = true and is_archived = false
    and (start_date is null or start_date <= now())
    and (end_date is null or end_date >= now())
  )
);

-- Form Field Options RLS
create policy "Owner can manage own form field options" on public.form_field_options for all using (
  exists (
    select 1 from public.form_fields
    join public.forms on forms.id = form_fields.form_id
    where form_fields.id = form_field_options.field_id and forms.user_id = auth.uid()
  )
);
create policy "Admins can manage all form field options" on public.form_field_options for all using (public.is_admin());
create policy "Public can view options of active public forms" on public.form_field_options for select using (
  exists (
    select 1 from public.form_fields
    join public.forms on forms.id = form_fields.form_id
    where form_fields.id = form_field_options.field_id and forms.is_public = true and forms.is_open = true and forms.is_archived = false
    and (forms.start_date is null or forms.start_date <= now())
    and (forms.end_date is null or forms.end_date >= now())
  )
);

-- Submissions RLS
create policy "Owner can view own form submissions" on public.submissions for select using (exists (select 1 from public.forms where id = submissions.form_id and user_id = auth.uid()));
create policy "Admins can view all submissions" on public.submissions for select using (public.is_admin());
-- Inserts are handled via Service Role in the backend. No public insert policy.

-- Submission Answers RLS
create policy "Owner can view own form submission answers" on public.submission_answers for select using (
  exists (
    select 1 from public.submissions
    join public.forms on forms.id = submissions.form_id
    where submissions.id = submission_answers.submission_id and forms.user_id = auth.uid()
  )
);
create policy "Admins can view all submission answers" on public.submission_answers for select using (public.is_admin());
-- Inserts handled via Service Role in backend.

-- Audit Logs RLS
create policy "Owner can view own audit logs" on public.audit_logs for select using (user_id = auth.uid());
create policy "Admins can view all audit logs" on public.audit_logs for select using (public.is_admin());

-- Helper function for safe submission
create or replace function public.submit_form_safe(
  p_form_id uuid,
  p_user_id uuid,
  p_submitter_email text,
  p_ip_hash text,
  p_answers jsonb -- Array of { field_id, value }
) returns uuid as $$
declare
  v_form record;
  v_submission_count int;
  v_submission_id uuid;
  v_answer jsonb;
begin
  -- Lock the form row to prevent race conditions on max_submissions
  select * into v_form from public.forms where id = p_form_id for update;

  if not found then
    raise exception 'Form not found';
  end if;

  if not v_form.is_open or v_form.is_archived then
    raise exception 'Form is not accepting responses';
  end if;

  if v_form.start_date is not null and v_form.start_date > now() then
    raise exception 'Form is not yet open';
  end if;

  if v_form.end_date is not null and v_form.end_date < now() then
    raise exception 'Form has closed';
  end if;

  if v_form.max_submissions is not null then
    select count(*) into v_submission_count from public.submissions where form_id = p_form_id;
    if v_submission_count >= v_form.max_submissions then
      raise exception 'Maximum submissions reached';
    end if;
  end if;

  if v_form.one_response_per_user then
    if p_user_id is not null then
      if exists (select 1 from public.submissions where form_id = p_form_id and user_id = p_user_id) then
        raise exception 'You have already submitted this form';
      end if;
    elsif p_ip_hash is not null then
      if exists (select 1 from public.submissions where form_id = p_form_id and ip_hash = p_ip_hash) then
        raise exception 'You have already submitted this form';
      end if;
    end if;
  end if;

  -- Insert submission
  insert into public.submissions (form_id, user_id, submitter_email, ip_hash)
  values (p_form_id, p_user_id, p_submitter_email, p_ip_hash)
  returning id into v_submission_id;

  -- Insert answers
  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.submission_answers (submission_id, field_id, value)
    values (v_submission_id, (v_answer->>'field_id')::uuid, v_answer->'value');
  end loop;

  return v_submission_id;
end;
$$ language plpgsql security definer;
