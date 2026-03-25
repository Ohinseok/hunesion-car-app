/**
 * GET /api/user/lookup?employee_id=xxx
 * 사원번호로 이름/부서 조회 (service_role → RLS 우회)
 * 예약 페이지에서 anon 키 대신 사용
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const employee_id = req.nextUrl.searchParams.get('employee_id');

  if (!employee_id?.trim()) {
    return NextResponse.json({ error: '사원번호를 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('name, department')
    .eq('employee_id', employee_id.trim())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `조회 오류: ${error.message}` }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: '등록되지 않은 사원번호입니다.' }, { status: 404 });
  }

  return NextResponse.json({ name: data.name, department: data.department });
}
