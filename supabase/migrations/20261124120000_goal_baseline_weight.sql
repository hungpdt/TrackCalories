-- Cân nặng tại thời điểm đặt mục tiêu, để gợi ý tính lại khi cân nặng thay đổi nhiều.
-- Lưu cùng bản ghi mục tiêu vì nhật ký cân nặng của ngày đó có thể được sửa sau (mốc so sánh không được đổi theo).
alter table public.goals
  add column baseline_weight_kg numeric(5, 2) check (baseline_weight_kg > 0 and baseline_weight_kg < 1000);

create or replace function public.save_profile_goal(p_profile jsonb, p_goal jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_effective date;
  v_goal_id uuid;
  v_weight numeric := nullif(p_profile ->> 'weight_kg', '')::numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.profiles set
    height_cm = (p_profile ->> 'height_cm')::numeric,
    age_years = (p_profile ->> 'age_years')::smallint,
    sex_for_formula = p_profile ->> 'sex_for_formula',
    body_fat_pct = nullif(p_profile ->> 'body_fat_pct', '')::numeric,
    activity_level = p_profile ->> 'activity_level',
    frequent_foods = coalesce(p_profile ->> 'frequent_foods', ''),
    favorite_foods = coalesce(p_profile ->> 'favorite_foods', ''),
    allergies = coalesce(p_profile ->> 'allergies', '')
  where id = v_uid
  returning timezone into v_tz;

  if v_tz is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  v_effective := (now() at time zone v_tz)::date;

  insert into public.goals as g (user_id, goal_type, weekly_adjustment_kcal, daily_kcal, protein_g, carbs_g, fat_g, effective_from, baseline_weight_kg)
  values (
    v_uid,
    p_goal ->> 'goal_type',
    coalesce((p_goal ->> 'weekly_adjustment_kcal')::integer, 0),
    (p_goal ->> 'daily_kcal')::numeric,
    (p_goal ->> 'protein_g')::numeric,
    (p_goal ->> 'carbs_g')::numeric,
    (p_goal ->> 'fat_g')::numeric,
    v_effective,
    v_weight
  )
  on conflict (user_id, effective_from) do update set
    goal_type = excluded.goal_type,
    weekly_adjustment_kcal = excluded.weekly_adjustment_kcal,
    daily_kcal = excluded.daily_kcal,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g,
    baseline_weight_kg = coalesce(excluded.baseline_weight_kg, g.baseline_weight_kg)
  returning g.id into v_goal_id;

  -- Cân nặng hiện tại ghi vào nhật ký cân nặng của ngày đó (một bản ghi/ngày).
  if v_weight is not null then
    insert into public.weight_logs (user_id, logged_date, weight_kg)
    values (v_uid, v_effective, v_weight)
    on conflict (user_id, logged_date) do update set weight_kg = excluded.weight_kg;
  end if;

  return jsonb_build_object('goal_id', v_goal_id, 'effective_from', v_effective);
end;
$$;
