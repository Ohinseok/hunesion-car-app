-- ============================================================
-- sql/04_migration.sql
-- reservations 테이블 상태 추가 + users 보완 컬럼
-- 실행: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. reservations.status 허용 값 확인 ─────────────────────
-- status 컬럼에 'in_use', 'cancelled' 값이 들어갈 수 있도록
-- (기존에 check constraint가 있는 경우에만 필요)
-- status 컬럼 타입을 text로 변경 (이미 text면 무시됨)
ALTER TABLE reservations
  ALTER COLUMN status SET DEFAULT 'pending';

-- ── 2. users 보완 컬럼 추가 ───────────────────────────────────
-- auth_id: Supabase Auth UUID (JWT 방식과 연동 시 사용, 없어도 무방)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id uuid;

-- is_active: 계정 활성/비활성 (NULL = 활성으로 처리)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- must_change_password: 최초 로그인 시 비밀번호 변경 강제 여부
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- ── 3. reservations 보완 컬럼 추가 ───────────────────────────
-- usage_type: 'used' | 'unused' (미사용 반납 구분)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS usage_type text DEFAULT 'used';

-- note: 특이사항
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS note text;

-- start_km / end_km / mileage: km 기록
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS start_km integer;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS end_km integer;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS mileage integer;

-- returned_at: 반납 처리 일시
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- ── 4. maintenance 테이블 생성 (없는 경우) ──────────────────
CREATE TABLE IF NOT EXISTS maintenance (
  id          bigint generated always as identity primary key,
  vehicle_id  bigint references vehicles(id) on delete cascade,
  date        date not null,
  description text not null,
  cost        integer default 0,
  created_at  timestamptz default now()
);

-- ── 5. RLS 정책 확인 (필요 시 03_rls_fix.sql 먼저 실행) ─────
-- users 테이블 recursive policy 제거 (이미 했다면 skip)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

-- ── 완료 메시지 ───────────────────────────────────────────────
SELECT '✅ 04_migration.sql 완료' AS result;
