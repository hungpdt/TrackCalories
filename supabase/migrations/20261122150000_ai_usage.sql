-- G2b: đếm lượt gọi AI theo tài khoản và ngày (theo múi giờ hồ sơ). Bảng kỹ thuật, client không đọc/ghi trực tiếp.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null check (usage_date between date '2000-01-01' and date '2100-12-31'),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Tăng bộ đếm nguyên tử; vượt giới hạn thì báo lỗi và không tăng. Trả số lượt còn lại trong ngày.
-- Server truyền giới hạn; người dùng tự gọi RPC này chỉ tốn lượt của chính mình, không mở thêm lượt AI.
create or replace function public.consume_ai_quota(p_daily_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_day date;
  v_limit integer := least(greatest(coalesce(p_daily_limit, 0), 1), 500);
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select timezone into v_tz from public.profiles where id = v_uid;
  v_day := (now() at time zone coalesce(v_tz, 'Asia/Ho_Chi_Minh'))::date;

  insert into public.ai_usage as u (user_id, usage_date, request_count)
  values (v_uid, v_day, 1)
  on conflict (user_id, usage_date) do update
    set request_count = u.request_count + 1, updated_at = now()
    where u.request_count < v_limit
  returning request_count into v_count;

  if v_count is null then
    raise exception 'ai_quota_exceeded' using errcode = 'P0001';
  end if;
  return v_limit - v_count;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
