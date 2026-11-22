-- G2: schema MVP, ràng buộc, RLS và RPC giao dịch. Xem docs/PLAN.md mục 4.
-- Quy ước: mọi bảng nghiệp vụ có owner (user_id hoặc profiles.id); số dinh dưỡng là numeric,
-- cận trên hữu hạn cũng loại NaN (NaN lớn hơn mọi số trong Postgres).

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  height_cm numeric(5, 1) check (height_cm > 0 and height_cm <= 300),
  age_years smallint check (age_years between 1 and 120),
  sex_for_formula text check (sex_for_formula in ('male', 'female')),
  body_fat_pct numeric(4, 1) check (body_fat_pct > 0 and body_fat_pct < 100),
  activity_level text check (activity_level in ('low', 'light', 'moderate', 'high')),
  frequent_foods text not null default '' check (char_length(frequent_foods) <= 300),
  favorite_foods text not null default '' check (char_length(favorite_foods) <= 300),
  allergies text not null default '' check (char_length(allergies) <= 300),
  timezone text not null default 'Asia/Ho_Chi_Minh' check (char_length(timezone) <= 64),
  unit_system text not null default 'metric' check (unit_system = 'metric'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Múi giờ không hợp lệ làm phép AT TIME ZONE báo lỗi; kiểm tra bằng trigger vì CHECK không tra catalog.
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform now() at time zone new.timezone;
  return new;
end;
$$;

create trigger profiles_validate_timezone before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Tạo hồ sơ rỗng khi có tài khoản mới.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_type text not null check (goal_type in ('lose', 'maintain', 'gain', 'recomposition')),
  weekly_adjustment_kcal integer not null default 0 check (weekly_adjustment_kcal between -3500 and 2100),
  target_weight_kg numeric(5, 1) check (target_weight_kg > 0 and target_weight_kg < 1000),
  daily_kcal numeric(7, 1) not null check (daily_kcal >= 0 and daily_kcal < 20000),
  protein_g numeric(7, 1) not null check (protein_g >= 0 and protein_g < 5000),
  carbs_g numeric(7, 1) not null check (carbs_g >= 0 and carbs_g < 5000),
  fat_g numeric(7, 1) not null check (fat_g >= 0 and fat_g < 5000),
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

-- ---------------------------------------------------------------- foods
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  brand text check (char_length(brand) <= 120),
  basis_type text not null check (basis_type in ('per_100g', 'per_100ml', 'per_serving', 'per_package')),
  basis_quantity numeric(12, 4) not null check (basis_quantity > 0 and basis_quantity < 100000),
  basis_unit text not null check (basis_unit in ('g', 'ml', 'serving', 'package')),
  serving_label text check (char_length(serving_label) <= 60),
  serving_mass_g numeric(12, 4) check (serving_mass_g > 0 and serving_mass_g < 100000),
  serving_volume_ml numeric(12, 4) check (serving_volume_ml > 0 and serving_volume_ml < 100000),
  kcal numeric(12, 4) not null check (kcal >= 0 and kcal < 100000),
  protein_g numeric(12, 4) not null check (protein_g >= 0 and protein_g < 100000),
  carbs_g numeric(12, 4) not null check (carbs_g >= 0 and carbs_g < 100000),
  fat_g numeric(12, 4) not null check (fat_g >= 0 and fat_g < 100000),
  source text not null check (source in ('manual', 'ai_estimate', 'label_scan')),
  source_note text check (char_length(source_note) <= 500),
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint foods_basis_consistent check (
    (basis_type = 'per_100g' and basis_unit = 'g' and basis_quantity = 100)
    or (basis_type = 'per_100ml' and basis_unit = 'ml' and basis_quantity = 100)
    or (basis_type = 'per_serving' and basis_unit = 'serving')
    or (basis_type = 'per_package' and basis_unit = 'package')
  )
);

create trigger foods_set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- meals & items
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_date date not null,
  eaten_at timestamptz not null default now(),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  note text check (char_length(note) <= 500),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create trigger meals_set_updated_at before update on public.meals
  for each row execute function public.set_updated_at();

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  meal_id uuid not null,
  food_id uuid,
  position smallint not null check (position >= 0),
  name_snapshot text not null check (char_length(btrim(name_snapshot)) between 1 and 120),
  basis_type_snapshot text not null check (basis_type_snapshot in ('per_100g', 'per_100ml', 'per_serving', 'per_package')),
  basis_quantity_snapshot numeric(12, 4) not null check (basis_quantity_snapshot > 0 and basis_quantity_snapshot < 100000),
  basis_unit_snapshot text not null check (basis_unit_snapshot in ('g', 'ml', 'serving', 'package')),
  serving_label_snapshot text check (char_length(serving_label_snapshot) <= 60),
  serving_mass_g_snapshot numeric(12, 4) check (serving_mass_g_snapshot > 0 and serving_mass_g_snapshot < 100000),
  serving_volume_ml_snapshot numeric(12, 4) check (serving_volume_ml_snapshot > 0 and serving_volume_ml_snapshot < 100000),
  consumed_quantity numeric(12, 4) not null check (consumed_quantity > 0 and consumed_quantity < 100000),
  consumed_unit text not null check (consumed_unit in ('g', 'ml', 'serving', 'package')),
  conversion_snapshot jsonb,
  base_kcal_snapshot numeric(12, 4) not null check (base_kcal_snapshot >= 0 and base_kcal_snapshot < 100000),
  base_protein_g_snapshot numeric(12, 4) not null check (base_protein_g_snapshot >= 0 and base_protein_g_snapshot < 100000),
  base_carbs_g_snapshot numeric(12, 4) not null check (base_carbs_g_snapshot >= 0 and base_carbs_g_snapshot < 100000),
  base_fat_g_snapshot numeric(12, 4) not null check (base_fat_g_snapshot >= 0 and base_fat_g_snapshot < 100000),
  total_kcal numeric(12, 4) not null check (total_kcal >= 0 and total_kcal < 100000),
  total_protein_g numeric(12, 4) not null check (total_protein_g >= 0 and total_protein_g < 100000),
  total_carbs_g numeric(12, 4) not null check (total_carbs_g >= 0 and total_carbs_g < 100000),
  total_fat_g numeric(12, 4) not null check (total_fat_g >= 0 and total_fat_g < 100000),
  source_snapshot text not null check (source_snapshot in ('manual', 'library', 'ai_estimate', 'label_scan')),
  assumptions_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(assumptions_snapshot) = 'array'),
  manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_id, position),
  -- meal và food phải cùng owner với item.
  foreign key (user_id, meal_id) references public.meals (user_id, id) on delete cascade,
  -- Xóa food chỉ đặt food_id về null, giữ user_id và snapshot.
  foreign key (user_id, food_id) references public.foods (user_id, id) on delete set null (food_id)
);

create trigger meal_items_set_updated_at before update on public.meal_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- weight
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 1000),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create trigger weight_logs_set_updated_at before update on public.weight_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- idempotency (kỹ thuật)
create table public.mutation_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  operation text not null check (operation in ('create_meal', 'update_meal')),
  payload_hash text not null,
  result_json jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

-- ---------------------------------------------------------------- indexes
create index meals_user_date_idx on public.meals (user_id, meal_date);
create index meal_items_user_meal_idx on public.meal_items (user_id, meal_id);
create index meal_items_user_food_idx on public.meal_items (user_id, food_id) where food_id is not null;
create index goals_user_effective_idx on public.goals (user_id, effective_from desc);
create index weight_logs_user_date_idx on public.weight_logs (user_id, logged_date);
create index foods_user_name_idx on public.foods (user_id, lower(name));
create index foods_user_last_used_idx on public.foods (user_id, last_used_at desc nulls last);

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.foods enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.weight_logs enable row level security;
alter table public.mutation_requests enable row level security;

-- Khách (anon) không có quyền gì trên dữ liệu cá nhân.
revoke all on public.profiles, public.goals, public.foods, public.meals, public.meal_items,
  public.weight_logs, public.mutation_requests from anon;
-- Bữa ăn chỉ được tạo/sửa qua RPC để giữ invariant; mutation_requests không cho client chạm tới.
revoke insert, update on public.meals, public.meal_items from authenticated;
revoke all on public.mutation_requests from authenticated;

create policy "profiles: đọc của mình" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles: tạo của mình" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profiles: sửa của mình" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "goals: đọc của mình" on public.goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "goals: tạo của mình" on public.goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "goals: sửa của mình" on public.goals for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals: xóa của mình" on public.goals for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "foods: đọc của mình" on public.foods for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "foods: tạo của mình" on public.foods for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "foods: sửa của mình" on public.foods for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "foods: xóa của mình" on public.foods for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "meals: đọc của mình" on public.meals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "meals: xóa của mình" on public.meals for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "meal_items: đọc của mình" on public.meal_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "weight_logs: đọc của mình" on public.weight_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "weight_logs: tạo của mình" on public.weight_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "weight_logs: sửa của mình" on public.weight_logs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weight_logs: xóa của mình" on public.weight_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- RPC: lưu hồ sơ + mục tiêu
-- Một transaction: cập nhật hồ sơ và ghi mục tiêu có hiệu lực từ hôm nay theo múi giờ hồ sơ.
-- Trùng ngày hiệu lực thì cập nhật phiên bản của ngày đó (người dùng đã xác nhận khi bấm lưu).
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

  insert into public.goals as g (user_id, goal_type, weekly_adjustment_kcal, daily_kcal, protein_g, carbs_g, fat_g, effective_from)
  values (
    v_uid,
    p_goal ->> 'goal_type',
    coalesce((p_goal ->> 'weekly_adjustment_kcal')::integer, 0),
    (p_goal ->> 'daily_kcal')::numeric,
    (p_goal ->> 'protein_g')::numeric,
    (p_goal ->> 'carbs_g')::numeric,
    (p_goal ->> 'fat_g')::numeric,
    v_effective
  )
  on conflict (user_id, effective_from) do update set
    goal_type = excluded.goal_type,
    weekly_adjustment_kcal = excluded.weekly_adjustment_kcal,
    daily_kcal = excluded.daily_kcal,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g
  returning g.id into v_goal_id;

  -- Cân nặng hiện tại ghi vào nhật ký cân nặng của ngày đó (một bản ghi/ngày).
  if p_profile ? 'weight_kg' then
    insert into public.weight_logs (user_id, logged_date, weight_kg)
    values (v_uid, v_effective, (p_profile ->> 'weight_kg')::numeric)
    on conflict (user_id, logged_date) do update set weight_kg = excluded.weight_kg;
  end if;

  return jsonb_build_object('goal_id', v_goal_id, 'effective_from', v_effective);
end;
$$;

-- ---------------------------------------------------------------- RPC: lưu bữa ăn
-- Tạo hoặc sửa một bữa và toàn bộ item trong một transaction, có idempotency theo request_id.
-- Tổng dinh dưỡng được tính lại tại đây từ cơ sở × hệ số, trừ item manual_override.
-- Không tự đổi ml↔g: chỉ quy đổi khi cùng đơn vị hoặc có khối lượng/thể tích khẩu phần.
create or replace function public.save_meal(
  p_request_id uuid,
  p_meal jsonb,
  p_items jsonb,
  p_meal_id uuid default null,
  p_expected_revision integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_operation text := case when p_meal_id is null then 'create_meal' else 'update_meal' end;
  v_hash text;
  v_existing public.mutation_requests%rowtype;
  v_meal_id uuid;
  v_revision integer;
  v_item record;
  v_factor numeric;
  v_override boolean;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'meal_requires_1_to_50_items' using errcode = '22023';
  end if;

  v_hash := md5(jsonb_build_array(v_operation, p_meal_id, p_expected_revision, p_meal, p_items)::text);

  -- Claim request_id; request đồng thời cùng khóa sẽ chờ transaction đầu xong rồi đọc kết quả.
  insert into public.mutation_requests (user_id, request_id, operation, payload_hash)
  values (v_uid, p_request_id, v_operation, v_hash)
  on conflict (user_id, request_id) do nothing;

  if not found then
    select * into v_existing from public.mutation_requests
    where user_id = v_uid and request_id = p_request_id;
    if v_existing.payload_hash <> v_hash or v_existing.operation <> v_operation then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;
    return v_existing.result_json;
  end if;

  if p_meal_id is null then
    insert into public.meals (user_id, meal_date, eaten_at, meal_type, note)
    values (
      v_uid,
      (p_meal ->> 'meal_date')::date,
      coalesce((p_meal ->> 'eaten_at')::timestamptz, now()),
      p_meal ->> 'meal_type',
      nullif(p_meal ->> 'note', '')
    )
    returning id, revision into v_meal_id, v_revision;
  else
    select id, revision into v_meal_id, v_revision from public.meals
    where id = p_meal_id and user_id = v_uid
    for update;
    if v_meal_id is null then
      raise exception 'meal_not_found' using errcode = 'P0002';
    end if;
    if p_expected_revision is distinct from v_revision then
      raise exception 'revision_conflict' using errcode = '40001';
    end if;
    update public.meals set
      meal_date = (p_meal ->> 'meal_date')::date,
      eaten_at = coalesce((p_meal ->> 'eaten_at')::timestamptz, eaten_at),
      meal_type = p_meal ->> 'meal_type',
      note = nullif(p_meal ->> 'note', ''),
      revision = revision + 1
    where id = v_meal_id
    returning revision into v_revision;
    delete from public.meal_items where meal_id = v_meal_id;
  end if;

  for v_item in
    select e.value as j, (e.ordinality - 1)::smallint as pos
    from jsonb_array_elements(p_items) with ordinality as e
  loop
    if v_item.j ? 'food_id' and v_item.j ->> 'food_id' is not null and not exists (
      select 1 from public.foods f where f.id = (v_item.j ->> 'food_id')::uuid and f.user_id = v_uid
    ) then
      raise exception 'food_not_found' using errcode = 'P0002';
    end if;

    v_factor := case
      when v_item.j ->> 'consumed_unit' = v_item.j ->> 'basis_unit' then
        (v_item.j ->> 'consumed_quantity')::numeric / (v_item.j ->> 'basis_quantity')::numeric
      when v_item.j ->> 'consumed_unit' = 'serving' and v_item.j ->> 'basis_unit' = 'g'
        and v_item.j ->> 'serving_mass_g' is not null then
        (v_item.j ->> 'consumed_quantity')::numeric * (v_item.j ->> 'serving_mass_g')::numeric / (v_item.j ->> 'basis_quantity')::numeric
      when v_item.j ->> 'consumed_unit' = 'serving' and v_item.j ->> 'basis_unit' = 'ml'
        and v_item.j ->> 'serving_volume_ml' is not null then
        (v_item.j ->> 'consumed_quantity')::numeric * (v_item.j ->> 'serving_volume_ml')::numeric / (v_item.j ->> 'basis_quantity')::numeric
      when v_item.j ->> 'consumed_unit' = 'g' and v_item.j ->> 'basis_unit' in ('serving', 'package')
        and v_item.j ->> 'serving_mass_g' is not null then
        (v_item.j ->> 'consumed_quantity')::numeric / (v_item.j ->> 'serving_mass_g')::numeric / (v_item.j ->> 'basis_quantity')::numeric
      when v_item.j ->> 'consumed_unit' = 'ml' and v_item.j ->> 'basis_unit' in ('serving', 'package')
        and v_item.j ->> 'serving_volume_ml' is not null then
        (v_item.j ->> 'consumed_quantity')::numeric / (v_item.j ->> 'serving_volume_ml')::numeric / (v_item.j ->> 'basis_quantity')::numeric
      else null
    end;

    v_override := coalesce((v_item.j ->> 'manual_override')::boolean, false);
    if v_factor is null and not v_override then
      raise exception 'incompatible_units' using errcode = '22023';
    end if;

    insert into public.meal_items (
      user_id, meal_id, food_id, position, name_snapshot,
      basis_type_snapshot, basis_quantity_snapshot, basis_unit_snapshot,
      serving_label_snapshot, serving_mass_g_snapshot, serving_volume_ml_snapshot,
      consumed_quantity, consumed_unit, conversion_snapshot,
      base_kcal_snapshot, base_protein_g_snapshot, base_carbs_g_snapshot, base_fat_g_snapshot,
      total_kcal, total_protein_g, total_carbs_g, total_fat_g,
      source_snapshot, assumptions_snapshot, manual_override
    ) values (
      v_uid, v_meal_id, (v_item.j ->> 'food_id')::uuid, v_item.pos, btrim(v_item.j ->> 'name'),
      v_item.j ->> 'basis_type', (v_item.j ->> 'basis_quantity')::numeric, v_item.j ->> 'basis_unit',
      v_item.j ->> 'serving_label', (v_item.j ->> 'serving_mass_g')::numeric, (v_item.j ->> 'serving_volume_ml')::numeric,
      (v_item.j ->> 'consumed_quantity')::numeric, v_item.j ->> 'consumed_unit',
      case when v_factor is null then null else jsonb_build_object('factor', v_factor) end,
      (v_item.j ->> 'kcal')::numeric, (v_item.j ->> 'protein_g')::numeric,
      (v_item.j ->> 'carbs_g')::numeric, (v_item.j ->> 'fat_g')::numeric,
      case when v_override then (v_item.j ->> 'total_kcal')::numeric else round((v_item.j ->> 'kcal')::numeric * v_factor, 4) end,
      case when v_override then (v_item.j ->> 'total_protein_g')::numeric else round((v_item.j ->> 'protein_g')::numeric * v_factor, 4) end,
      case when v_override then (v_item.j ->> 'total_carbs_g')::numeric else round((v_item.j ->> 'carbs_g')::numeric * v_factor, 4) end,
      case when v_override then (v_item.j ->> 'total_fat_g')::numeric else round((v_item.j ->> 'fat_g')::numeric * v_factor, 4) end,
      coalesce(v_item.j ->> 'source', 'manual'),
      coalesce(v_item.j -> 'assumptions', '[]'::jsonb),
      v_override
    );

    if v_item.j ->> 'food_id' is not null then
      update public.foods set last_used_at = now()
      where id = (v_item.j ->> 'food_id')::uuid and user_id = v_uid;
    end if;
  end loop;

  v_result := jsonb_build_object('meal_id', v_meal_id, 'revision', v_revision);
  update public.mutation_requests set result_json = v_result
  where user_id = v_uid and request_id = p_request_id;
  return v_result;
end;
$$;

revoke all on function public.save_meal(uuid, jsonb, jsonb, uuid, integer) from public, anon;
grant execute on function public.save_meal(uuid, jsonb, jsonb, uuid, integer) to authenticated;
revoke all on function public.save_profile_goal(jsonb, jsonb) from public, anon;
grant execute on function public.save_profile_goal(jsonb, jsonb) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
