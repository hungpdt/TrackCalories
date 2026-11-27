-- Thêm mức vận động "rất nhiều" (hệ số 1,9) cho người tập nặng mỗi ngày.
alter table public.profiles drop constraint if exists profiles_activity_level_check;
alter table public.profiles add constraint profiles_activity_level_check
  check (activity_level in ('low', 'light', 'moderate', 'high', 'very_high'));
