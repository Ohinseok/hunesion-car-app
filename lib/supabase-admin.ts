/**
 * Supabase Admin Client (Service Role)
 * - 서버 사이드 전용 (API Routes에서만 사용)
 * - SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_ 접두사 없이 .env.local에 설정
 * - 절대 클라이언트 컴포넌트에 import 하지 마세요
 */
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * 요청 헤더의 Bearer 토큰으로 사용자 인증 후 admin 여부 확인 (Supabase JWT 방식)
 */
export async function verifyAdminToken(authHeader: string | null): Promise<{
  ok: boolean;
  userId?: string;
  error?: string;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Authorization header missing' };
  }
  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { ok: false, error: 'Invalid token' };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('auth_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    return { ok: false, error: 'Admin permission required' };
  }

  return { ok: true, userId: user.id };
}

/**
 * 사원번호(X-Admin-Id 헤더)로 관리자 권한 검증 (DB 비밀번호 로그인 방식과 함께 사용)
 */
export async function verifyAdminId(adminId: string | null): Promise<{
  ok: boolean;
  employeeId?: string;
  error?: string;
}> {
  if (!adminId || !adminId.trim()) {
    return { ok: false, error: '관리자 인증이 필요합니다.' };
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role, is_active, employee_id')
    .eq('employee_id', adminId.trim())
    .maybeSingle();

  if (error) return { ok: false, error: `인증 조회 오류: ${error.message}` };
  if (!data) return { ok: false, error: '등록되지 않은 관리자입니다.' };
  // NULL은 활성으로 처리 (is_active 컬럼이 없거나 미설정인 경우 허용)
  if (data.is_active === false) return { ok: false, error: '비활성화된 계정입니다.' };
  if (data.role !== 'admin') return { ok: false, error: '관리자 권한이 없습니다.' };

  return { ok: true, employeeId: data.employee_id };
}
