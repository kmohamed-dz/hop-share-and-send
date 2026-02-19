-- ======================================================================
-- أبشر | إعداد قاعدة البيانات (Postgres + RLS + Storage) لمشروع Supabase
-- ======================================================================
-- ملاحظات:
-- 1) هذا الملف لا يحذف الجداول تلقائياً (No DROP TABLE).
-- 2) استخدمه في مشروع Supabase جديد أو بعد مراجعة المخطط الحالي.
-- 3) اختبر RLS من التطبيق مع جلسة مستخدم، وليس فقط من SQL Editor.

create extension if not exists "pgcrypto";

-- ======================================================================
-- الجداول الأساسية
-- ======================================================================

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wilaya text not null,
  address text,
  school_code text not null unique,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text,
  school_id uuid references public.schools (id) on delete set null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_role_check check (
    role is null
    or role in ('school_admin', 'teacher', 'student', 'parent', 'authority_admin')
  )
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  full_name text not null,
  level text,
  parent_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  full_name text not null,
  specialization text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  date date not null,
  status text not null check (status in ('حاضر', 'غائب', 'متأخر', 'بعذر')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_id, date)
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid references public.teachers (id) on delete set null,
  title text not null,
  description text,
  due_date date,
  level text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid references public.teachers (id) on delete set null,
  title text not null,
  exam_date date not null,
  max_score numeric(8,2) not null default 100,
  level text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint exams_max_score_check check (max_score >= 0)
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  score numeric(8,2) not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (exam_id, student_id),
  constraint results_score_check check (score >= 0)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.library (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  file_type text,
  level text,
  file_path text,
  public_url text,
  file_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ======================================================================
-- الفهارس (Indexes)
-- ======================================================================

create unique index if not exists idx_schools_created_by_unique
  on public.schools (created_by)
  where created_by is not null;
create index if not exists idx_schools_created_at on public.schools (created_at);

create index if not exists idx_profiles_school_id on public.profiles (school_id);
create index if not exists idx_profiles_created_at on public.profiles (created_at);

create index if not exists idx_students_school_id on public.students (school_id);
create index if not exists idx_students_created_at on public.students (created_at);

create index if not exists idx_teachers_school_id on public.teachers (school_id);
create index if not exists idx_teachers_created_at on public.teachers (created_at);

create index if not exists idx_attendance_school_id on public.attendance (school_id);
create index if not exists idx_attendance_student_id on public.attendance (student_id);
create index if not exists idx_attendance_date on public.attendance (date);
create index if not exists idx_attendance_created_at on public.attendance (created_at);

create index if not exists idx_homework_school_id on public.homework (school_id);
create index if not exists idx_homework_teacher_id on public.homework (teacher_id);
create index if not exists idx_homework_due_date on public.homework (due_date);
create index if not exists idx_homework_created_at on public.homework (created_at);

create index if not exists idx_exams_school_id on public.exams (school_id);
create index if not exists idx_exams_teacher_id on public.exams (teacher_id);
create index if not exists idx_exams_exam_date on public.exams (exam_date);
create index if not exists idx_exams_created_at on public.exams (created_at);

create index if not exists idx_results_school_id on public.results (school_id);
create index if not exists idx_results_exam_id on public.results (exam_id);
create index if not exists idx_results_student_id on public.results (student_id);
create index if not exists idx_results_created_at on public.results (created_at);

create index if not exists idx_messages_school_id on public.messages (school_id);
create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_receiver_id on public.messages (receiver_id);
create index if not exists idx_messages_created_at on public.messages (created_at);

create index if not exists idx_notifications_school_id on public.notifications (school_id);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_created_at on public.notifications (created_at);

create index if not exists idx_library_school_id on public.library (school_id);
create index if not exists idx_library_uploaded_by on public.library (uploaded_by);
create index if not exists idx_library_created_at on public.library (created_at);

-- ======================================================================
-- دوال مساعدة للـ RLS
-- ======================================================================

create or replace function public.current_school_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_school_id() from public;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ======================================================================
-- Triggers: updated_at + إنشاء profile تلقائياً + تنبيه الغياب
-- ======================================================================

create or replace function public.set_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_schools_set_updated_at on public.schools;
create trigger trg_schools_set_updated_at
before update on public.schools
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_students_set_updated_at on public.students;
create trigger trg_students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_teachers_set_updated_at on public.teachers;
create trigger trg_teachers_set_updated_at
before update on public.teachers
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_attendance_set_updated_at on public.attendance;
create trigger trg_attendance_set_updated_at
before update on public.attendance
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_homework_set_updated_at on public.homework;
create trigger trg_homework_set_updated_at
before update on public.homework
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_exams_set_updated_at on public.exams;
create trigger trg_exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_results_set_updated_at on public.results;
create trigger trg_results_set_updated_at
before update on public.results
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_notifications_set_updated_at on public.notifications;
create trigger trg_notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at_column();

drop trigger if exists trg_library_set_updated_at on public.library;
create trigger trg_library_set_updated_at
before update on public.library
for each row execute function public.set_updated_at_column();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.notify_absence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_name text;
begin
  if new.status = 'غائب' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select s.full_name into v_student_name
    from public.students s
    where s.id = new.student_id;

    insert into public.notifications (school_id, user_id, title, message, type)
    select
      new.school_id,
      p.id,
      'تنبيه غياب',
      format(
        'تم تسجيل غياب الطالب %s بتاريخ %s',
        coalesce(v_student_name, 'غير محدد'),
        new.date::text
      ),
      'absence'
    from public.profiles p
    where p.school_id = new.school_id
      and p.role in ('school_admin', 'teacher');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_attendance_absence_notification on public.attendance;
create trigger trg_attendance_absence_notification
after insert or update of status on public.attendance
for each row execute function public.notify_absence();

-- ======================================================================
-- RPC: جلب بيانات مجمعة للـ authority_admin + bootstrap join helper
-- ======================================================================

create or replace function public.authority_school_overview()
returns table (
  school_id uuid,
  school_name text,
  students_count bigint,
  teachers_count bigint,
  attendance_count bigint,
  homework_count bigint,
  exams_count bigint,
  results_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'authority_admin' then
    raise exception 'Access denied for this RPC';
  end if;

  return query
  select
    s.id as school_id,
    s.name as school_name,
    coalesce(st.students_count, 0) as students_count,
    coalesce(tc.teachers_count, 0) as teachers_count,
    coalesce(ac.attendance_count, 0) as attendance_count,
    coalesce(hw.homework_count, 0) as homework_count,
    coalesce(ex.exam_count, 0) as exams_count,
    coalesce(rs.results_count, 0) as results_count
  from public.schools s
  left join (
    select school_id, count(*) as students_count
    from public.students
    group by school_id
  ) st on st.school_id = s.id
  left join (
    select school_id, count(*) as teachers_count
    from public.teachers
    group by school_id
  ) tc on tc.school_id = s.id
  left join (
    select school_id, count(*) as attendance_count
    from public.attendance
    group by school_id
  ) ac on ac.school_id = s.id
  left join (
    select school_id, count(*) as homework_count
    from public.homework
    group by school_id
  ) hw on hw.school_id = s.id
  left join (
    select school_id, count(*) as exam_count
    from public.exams
    group by school_id
  ) ex on ex.school_id = s.id
  left join (
    select school_id, count(*) as results_count
    from public.results
    group by school_id
  ) rs on rs.school_id = s.id
  order by s.name;
end;
$$;

create or replace function public.resolve_school_id_by_code(p_school_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select s.id
  into v_school_id
  from public.schools s
  where s.school_code = upper(trim(p_school_code))
  limit 1;

  return v_school_id;
end;
$$;

revoke all on function public.authority_school_overview() from public;
revoke all on function public.resolve_school_id_by_code(text) from public;
grant execute on function public.authority_school_overview() to authenticated;
grant execute on function public.resolve_school_id_by_code(text) to authenticated;

-- ======================================================================
-- RLS enable
-- ======================================================================

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.homework enable row level security;
alter table public.exams enable row level security;
alter table public.results enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.library enable row level security;

-- ======================================================================
-- سياسات profiles
-- ======================================================================

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ======================================================================
-- سياسات schools (مع bootstrap onboarding)
-- ======================================================================

drop policy if exists schools_select_same_school on public.schools;
create policy schools_select_same_school
on public.schools
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and (
    id = public.current_school_id()
    or created_by = auth.uid()
  )
);

drop policy if exists schools_insert_bootstrap on public.schools;
create policy schools_insert_bootstrap
on public.schools
for insert
with check (
  auth.uid() is not null
  and coalesce(created_by, auth.uid()) = auth.uid()
  and public.current_school_id() is null
  and (
    public.current_user_role() = 'school_admin'
    or public.current_user_role() is null
  )
);

drop policy if exists schools_update_school_admin on public.schools;
create policy schools_update_school_admin
on public.schools
for update
using (
  public.current_user_role() = 'school_admin'
  and id = public.current_school_id()
)
with check (
  public.current_user_role() = 'school_admin'
  and id = public.current_school_id()
);

drop policy if exists schools_delete_school_admin on public.schools;
create policy schools_delete_school_admin
on public.schools
for delete
using (
  public.current_user_role() = 'school_admin'
  and id = public.current_school_id()
);

-- ======================================================================
-- سياسات الطلاب والمعلمين
-- ======================================================================

drop policy if exists students_select_same_school on public.students;
create policy students_select_same_school
on public.students
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and school_id = public.current_school_id()
);

drop policy if exists students_insert_school_admin on public.students;
create policy students_insert_school_admin
on public.students
for insert
with check (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
);

drop policy if exists students_update_school_admin on public.students;
create policy students_update_school_admin
on public.students
for update
using (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
)
with check (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
);

drop policy if exists students_delete_school_admin on public.students;
create policy students_delete_school_admin
on public.students
for delete
using (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
);

drop policy if exists teachers_select_same_school on public.teachers;
create policy teachers_select_same_school
on public.teachers
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and school_id = public.current_school_id()
);

drop policy if exists teachers_insert_school_admin on public.teachers;
create policy teachers_insert_school_admin
on public.teachers
for insert
with check (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
);

drop policy if exists teachers_update_school_admin on public.teachers;
create policy teachers_update_school_admin
on public.teachers
for update
using (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
)
with check (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
);

drop policy if exists teachers_delete_school_admin on public.teachers;
create policy teachers_delete_school_admin
on public.teachers
for delete
using (
  public.current_user_role() = 'school_admin'
  and school_id = public.current_school_id()
);

-- ======================================================================
-- سياسات attendance/homework/exams/results
-- school_admin: CRUD
-- teacher: CRUD داخل نفس المدرسة
-- student/parent: قراءة فقط
-- authority_admin: بدون وصول مباشر
-- ======================================================================

drop policy if exists attendance_select_same_school on public.attendance;
create policy attendance_select_same_school
on public.attendance
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and school_id = public.current_school_id()
);

drop policy if exists attendance_insert_staff on public.attendance;
create policy attendance_insert_staff
on public.attendance
for insert
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists attendance_update_staff on public.attendance;
create policy attendance_update_staff
on public.attendance
for update
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
)
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists attendance_delete_staff on public.attendance;
create policy attendance_delete_staff
on public.attendance
for delete
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists homework_select_same_school on public.homework;
create policy homework_select_same_school
on public.homework
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and school_id = public.current_school_id()
);

drop policy if exists homework_insert_staff on public.homework;
create policy homework_insert_staff
on public.homework
for insert
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists homework_update_staff on public.homework;
create policy homework_update_staff
on public.homework
for update
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
)
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists homework_delete_staff on public.homework;
create policy homework_delete_staff
on public.homework
for delete
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists exams_select_same_school on public.exams;
create policy exams_select_same_school
on public.exams
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and school_id = public.current_school_id()
);

drop policy if exists exams_insert_staff on public.exams;
create policy exams_insert_staff
on public.exams
for insert
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists exams_update_staff on public.exams;
create policy exams_update_staff
on public.exams
for update
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
)
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists exams_delete_staff on public.exams;
create policy exams_delete_staff
on public.exams
for delete
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists results_select_same_school on public.results;
create policy results_select_same_school
on public.results
for select
using (
  public.current_user_role() is distinct from 'authority_admin'
  and school_id = public.current_school_id()
);

drop policy if exists results_insert_staff on public.results;
create policy results_insert_staff
on public.results
for insert
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists results_update_staff on public.results;
create policy results_update_staff
on public.results
for update
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
)
with check (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

drop policy if exists results_delete_staff on public.results;
create policy results_delete_staff
on public.results
for delete
using (
  public.current_user_role() in ('school_admin', 'teacher')
  and school_id = public.current_school_id()
);

-- ======================================================================
-- سياسات messages / notifications / library
-- ======================================================================

drop policy if exists messages_select_same_school on public.messages;
create policy messages_select_same_school
on public.messages
for select
using (
  public.current_user_role() in ('school_admin', 'teacher', 'student', 'parent')
  and school_id = public.current_school_id()
);

drop policy if exists messages_insert_school_members on public.messages;
create policy messages_insert_school_members
on public.messages
for insert
with check (
  public.current_user_role() in ('school_admin', 'teacher', 'student', 'parent')
  and school_id = public.current_school_id()
  and sender_id = auth.uid()
);

drop policy if exists messages_update_receiver_or_admin on public.messages;
create policy messages_update_receiver_or_admin
on public.messages
for update
using (
  school_id = public.current_school_id()
  and (
    receiver_id = auth.uid()
    or public.current_user_role() = 'school_admin'
  )
)
with check (
  school_id = public.current_school_id()
  and (
    receiver_id = auth.uid()
    or public.current_user_role() = 'school_admin'
  )
);

drop policy if exists messages_delete_school_admin on public.messages;
create policy messages_delete_school_admin
on public.messages
for delete
using (
  school_id = public.current_school_id()
  and public.current_user_role() = 'school_admin'
);

drop policy if exists notifications_select_same_school on public.notifications;
create policy notifications_select_same_school
on public.notifications
for select
using (
  school_id = public.current_school_id()
  and (
    user_id = auth.uid()
    or public.current_user_role() in ('school_admin', 'teacher')
  )
  and public.current_user_role() is distinct from 'authority_admin'
);

drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff
on public.notifications
for insert
with check (
  school_id = public.current_school_id()
  and public.current_user_role() in ('school_admin', 'teacher')
);

drop policy if exists notifications_update_staff_or_owner on public.notifications;
create policy notifications_update_staff_or_owner
on public.notifications
for update
using (
  school_id = public.current_school_id()
  and (
    user_id = auth.uid()
    or public.current_user_role() in ('school_admin', 'teacher')
  )
)
with check (
  school_id = public.current_school_id()
  and (
    user_id = auth.uid()
    or public.current_user_role() in ('school_admin', 'teacher')
  )
);

drop policy if exists notifications_delete_school_admin on public.notifications;
create policy notifications_delete_school_admin
on public.notifications
for delete
using (
  school_id = public.current_school_id()
  and public.current_user_role() = 'school_admin'
);

drop policy if exists library_select_same_school on public.library;
create policy library_select_same_school
on public.library
for select
using (
  school_id = public.current_school_id()
  and public.current_user_role() in ('school_admin', 'teacher', 'student', 'parent')
);

drop policy if exists library_insert_staff on public.library;
create policy library_insert_staff
on public.library
for insert
with check (
  school_id = public.current_school_id()
  and uploaded_by = auth.uid()
  and public.current_user_role() in ('school_admin', 'teacher')
);

drop policy if exists library_update_staff on public.library;
create policy library_update_staff
on public.library
for update
using (
  school_id = public.current_school_id()
  and (
    public.current_user_role() = 'school_admin'
    or (public.current_user_role() = 'teacher' and uploaded_by = auth.uid())
  )
)
with check (
  school_id = public.current_school_id()
  and (
    public.current_user_role() = 'school_admin'
    or (public.current_user_role() = 'teacher' and uploaded_by = auth.uid())
  )
);

drop policy if exists library_delete_staff on public.library;
create policy library_delete_staff
on public.library
for delete
using (
  school_id = public.current_school_id()
  and (
    public.current_user_role() = 'school_admin'
    or (public.current_user_role() = 'teacher' and uploaded_by = auth.uid())
  )
);

-- ======================================================================
-- Storage Buckets + سياسات الوصول
-- ======================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do nothing;

-- ملاحظة مهمة:
-- في بعض مشاريع Supabase تكون ownership لجدول storage.objects على role داخلي.
-- لذلك نطبق سياسات Storage فقط إذا كان الـ role الحالي يملك الجدول، وإلا نتخطاها
-- بدون إيقاف السكربت (لتجنب خطأ: must be owner of table objects).
do $storage_policies$
declare
  v_objects_owner text;
begin
  select pg_get_userbyid(c.relowner)
  into v_objects_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
  limit 1;

  if v_objects_owner is null then
    raise notice 'storage.objects غير موجود. تم تخطي سياسات Storage.';
    return;
  end if;

  if current_user <> v_objects_owner then
    raise notice 'تم تخطي سياسات storage.objects: role الحالي (%) ليس owner (%).', current_user, v_objects_owner;
    return;
  end if;

  execute 'drop policy if exists avatars_select_own_folder on storage.objects';
  execute 'create policy avatars_select_own_folder on storage.objects for select using (
    bucket_id = ''avatars''
    and auth.uid() is not null
    and split_part(name, ''/'', 1) = auth.uid()::text
  )';

  execute 'drop policy if exists avatars_insert_own_folder on storage.objects';
  execute 'create policy avatars_insert_own_folder on storage.objects for insert with check (
    bucket_id = ''avatars''
    and auth.uid() is not null
    and split_part(name, ''/'', 1) = auth.uid()::text
  )';

  execute 'drop policy if exists avatars_update_own_folder on storage.objects';
  execute 'create policy avatars_update_own_folder on storage.objects for update using (
    bucket_id = ''avatars''
    and auth.uid() is not null
    and split_part(name, ''/'', 1) = auth.uid()::text
  ) with check (
    bucket_id = ''avatars''
    and auth.uid() is not null
    and split_part(name, ''/'', 1) = auth.uid()::text
  )';

  execute 'drop policy if exists avatars_delete_own_folder on storage.objects';
  execute 'create policy avatars_delete_own_folder on storage.objects for delete using (
    bucket_id = ''avatars''
    and auth.uid() is not null
    and split_part(name, ''/'', 1) = auth.uid()::text
  )';

  execute 'drop policy if exists library_storage_select_school_folder on storage.objects';
  execute 'create policy library_storage_select_school_folder on storage.objects for select using (
    bucket_id = ''library''
    and public.current_school_id() is not null
    and split_part(name, ''/'', 1) = public.current_school_id()::text
    and public.current_user_role() in (''school_admin'', ''teacher'', ''student'', ''parent'')
  )';

  execute 'drop policy if exists library_storage_insert_staff on storage.objects';
  execute 'create policy library_storage_insert_staff on storage.objects for insert with check (
    bucket_id = ''library''
    and public.current_school_id() is not null
    and split_part(name, ''/'', 1) = public.current_school_id()::text
    and public.current_user_role() in (''school_admin'', ''teacher'')
  )';

  execute 'drop policy if exists library_storage_update_staff on storage.objects';
  execute 'create policy library_storage_update_staff on storage.objects for update using (
    bucket_id = ''library''
    and public.current_school_id() is not null
    and split_part(name, ''/'', 1) = public.current_school_id()::text
    and public.current_user_role() in (''school_admin'', ''teacher'')
  ) with check (
    bucket_id = ''library''
    and public.current_school_id() is not null
    and split_part(name, ''/'', 1) = public.current_school_id()::text
    and public.current_user_role() in (''school_admin'', ''teacher'')
  )';

  execute 'drop policy if exists library_storage_delete_staff on storage.objects';
  execute 'create policy library_storage_delete_staff on storage.objects for delete using (
    bucket_id = ''library''
    and public.current_school_id() is not null
    and split_part(name, ''/'', 1) = public.current_school_id()::text
    and public.current_user_role() in (''school_admin'', ''teacher'')
  )';
exception
  when insufficient_privilege then
    raise notice 'تم تخطي سياسات storage.objects بسبب الصلاحيات: %', sqlerrm;
end;
$storage_policies$;
