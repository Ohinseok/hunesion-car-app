-- ============================================================
-- 03_rls_fix.sql
-- 사내 내부 전용 도구용 RLS 정책 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ── vehicles: 전체 읽기 허용, 쓰기는 service_role(관리자 API)만 ──
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_vehicles" ON vehicles;
CREATE POLICY "allow_read_vehicles" ON vehicles
  FOR SELECT USING (true);

-- ── reservations: 읽기/쓰기 모두 허용 (사내 내부 도구) ──────────
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_reservations" ON reservations;
CREATE POLICY "allow_read_reservations" ON reservations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_insert_reservations" ON reservations;
CREATE POLICY "allow_insert_reservations" ON reservations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_reservations" ON reservations;
CREATE POLICY "allow_update_reservations" ON reservations
  FOR UPDATE USING (true);

-- ── maintenance: 전체 허용 (사내 내부 도구) ─────────────────────
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_maintenance" ON maintenance;
CREATE POLICY "allow_all_maintenance" ON maintenance
  FOR ALL USING (true);

-- ── users: service_role만 접근 (이미 API Route로 처리) ──────────
-- users 테이블은 RLS 유지 (개인정보 보호)
-- 관리자 페이지 및 예약 페이지는 /api/* Route를 통해 service_role로 접근
