-- Hori 앱 데이터베이스 스키마
-- docs/design/credit-system-design.md, docs/design/supabase-credit-functions.ts 기반

-- 1. users: 인증 사용자당 1행. credits는 Edge Function(서비스 롤)만 갱신한다.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users can read their own row"
  on public.users for select
  using (auth.uid() = id);

-- 신규 가입 시 +1 질문권 지급 (credit-system-design.md 1절)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, credits) values (new.id, 1);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. saju_profiles: 온보딩에서 계산한 사주/점성술 분석 결과 저장 (재방문 시 재계산 방지)
create table if not exists public.saju_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  birth_input jsonb not null,
  analysis jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saju_profiles enable row level security;

create policy "users can manage their own saju profile"
  on public.saju_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. messages: 대화 기록. 클라이언트는 조회만 하고, 쓰기는 chat Edge Function(서비스 롤)이 담당한다.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  category text not null check (category in ('love', 'wealth', 'career', 'today')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "users can read their own messages"
  on public.messages for select
  using (auth.uid() = user_id);

create index if not exists messages_user_id_created_at_idx
  on public.messages (user_id, created_at desc);

-- 4. ad_reward_logs: 리워드 광고 시청 로그 (일일 시청 한도 체크용)
create table if not exists public.ad_reward_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ad_reward_logs enable row level security;
-- 클라이언트는 직접 읽거나 쓸 수 없다. Edge Function(서비스 롤)만 접근한다.

-- 5. processed_receipts: IAP 영수증 중복 지급 방지
create table if not exists public.processed_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_hash text not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now()
);

alter table public.processed_receipts enable row level security;
-- 클라이언트는 직접 읽거나 쓸 수 없다. Edge Function(서비스 롤)만 접근한다.
