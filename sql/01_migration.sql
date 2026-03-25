-- ============================================================
-- HUNESION CAR APP — DB 마이그레이션 (기존 users 테이블 확장)
-- Supabase SQL Editor 에서 순서대로 실행하세요
-- ============================================================

-- 1. users 테이블에 신규 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_id          uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS department       text;   -- 기존 컬럼 없을 경우 대비

-- 2. 기존 plain-text 비밀번호 컬럼 제거 (Supabase Auth가 관리)
--    ※ 마이그레이션 전 기존 데이터 백업 필수!
--    ALTER TABLE public.users DROP COLUMN IF EXISTS password;
--    → 준비 완료 후 위 주석 해제 후 실행

-- 3. email 컬럼 unique 제약 추가 (없을 경우)
ALTER TABLE public.users
  ADD CONSTRAINT users_email_unique UNIQUE (email);

-- 4. created_at 기본값 통일
ALTER TABLE public.users
  ALTER COLUMN created_at SET DEFAULT now();

-- 5. employees 일괄업로드 로그 테이블 (선택)
CREATE TABLE IF NOT EXISTS public.bulk_upload_logs (
  id          serial PRIMARY KEY,
  uploaded_by text,
  total       int,
  success     int,
  failed      int,
  detail      jsonb,
  created_at  timestamptz DEFAULT now()
);

-- 완료 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
