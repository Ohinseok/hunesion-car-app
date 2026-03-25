-- ============================================================
-- HUNESION CAR APP — Row Level Security 정책
-- ============================================================

-- ── users 테이블 RLS ────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "users_select_own"   ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own"   ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

-- 본인 데이터 조회 (로그인한 사용자)
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

-- 관리자 전체 조회
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- 관리자만 INSERT
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- 본인 데이터 UPDATE (must_change_password, department 등)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- 관리자 전체 UPDATE
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- 관리자만 DELETE
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ── reservations 테이블 RLS ─────────────────────────────────
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "res_select_own"   ON public.reservations;
DROP POLICY IF EXISTS "res_select_admin" ON public.reservations;
DROP POLICY IF EXISTS "res_insert_own"   ON public.reservations;
DROP POLICY IF EXISTS "res_update_admin" ON public.reservations;

CREATE POLICY "res_select_own" ON public.reservations
  FOR SELECT USING (
    user_name = (SELECT name FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "res_select_admin" ON public.reservations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "res_insert_own" ON public.reservations
  FOR INSERT WITH CHECK (
    user_name = (SELECT name FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "res_update_admin" ON public.reservations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  );

-- ── vehicles 테이블 RLS ─────────────────────────────────────
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_read_all"    ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_write_admin" ON public.vehicles;

-- 인증된 사용자 전체 조회
CREATE POLICY "vehicles_read_all" ON public.vehicles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 관리자만 쓰기
CREATE POLICY "vehicles_write_admin" ON public.vehicles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  );

-- ── 헬퍼 함수: 사번으로 이메일 조회 (로그인용) ───────────────
CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(p_employee_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회 (로그인 전 조회 필요)
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.users
  WHERE employee_id = p_employee_id
    AND is_active = true;
  RETURN v_email;
END;
$$;

-- 함수는 anon 도 호출 가능 (로그인 전 이메일 조회)
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id TO anon, authenticated;

-- ── 헬퍼 함수: 현재 사용자 role 조회 ───────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE auth_id = auth.uid();
  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
