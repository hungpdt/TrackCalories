-- Sửa theo review 25/11/2026.

-- 1) Tổng dinh dưỡng theo ngày, gom trong SQL: trả tối đa một dòng/ngày nên không bị cắt ở giới hạn
--    max_rows (1000) của API như khi đọc từng bữa/món rồi cộng ở app. SECURITY INVOKER: RLS vẫn áp dụng.
create or replace function public.daily_totals(p_from date, p_to date)
returns table (meal_date date, kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.meal_date,
    coalesce(sum(i.total_kcal), 0), coalesce(sum(i.total_protein_g), 0),
    coalesce(sum(i.total_carbs_g), 0), coalesce(sum(i.total_fat_g), 0)
  from public.meals m
  left join public.meal_items i on i.meal_id = m.id and i.user_id = m.user_id
  where m.user_id = (select auth.uid())
    and m.meal_date between p_from and p_to
    and p_to - p_from <= 800
  group by m.meal_date
  order by m.meal_date;
$$;

revoke all on function public.daily_totals(date, date) from public, anon;
grant execute on function public.daily_totals(date, date) to authenticated;

-- 2) Hạn mức AI tính theo ngày cố định Asia/Ho_Chi_Minh thay vì múi giờ hồ sơ: người dùng sửa được
--    profiles.timezone, đổi qua lại giữa các múi giờ xa nhau sẽ được thêm lượt trong cùng một ngày thật.
create or replace function public.consume_ai_quota(p_daily_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_limit integer := least(greatest(coalesce(p_daily_limit, 0), 1), 500);
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

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
