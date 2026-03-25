/**
 * POST /api/auth/admin-login
 * RLS 우회: service role key로 관리자 로그인 검증
 * Body: { employee_id, password }
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { employee_id, password } = await req.json();

  if (!employee_id || !password) {
    return NextResponse.json({ error: '사원번호와 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  // service role → RLS 우회하여 조회
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('name, role, password, is_active')
    .eq('employee_id', employee_id.trim())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `조회 오류: ${error.message}` }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '등록되지 않은 사원번호입니다.' }, { status: 401 });
  }
  if (data.is_active === false) {
    return NextResponse.json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' }, { status: 403 });
  }
  if (data.password !== password) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  if (data.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  return NextResponse.json({ success: true, name: data.name, employee_id: employee_id.trim() });
}
