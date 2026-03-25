/**
 * GET /api/reservations/by-employee?employee_id=xxx&mode=return
 * 사원번호로 예약 조회 (service_role → RLS 우회)
 * mode=return : 반납 가능한 예약 (status=approved, returned_at=null)
 * mode=history: 전체 이력
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const employee_id = req.nextUrl.searchParams.get('employee_id');
  const mode = req.nextUrl.searchParams.get('mode') ?? 'return';

  if (!employee_id?.trim()) {
    return NextResponse.json({ error: '사원번호를 입력해주세요.' }, { status: 400 });
  }

  // 사원번호 → 이름 조회
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('name, department')
    .eq('employee_id', employee_id.trim())
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: '등록되지 않은 사원번호입니다.' }, { status: 404 });
  }

  // 예약 조회
  let query = supabaseAdmin
    .from('reservations')
    .select('id, user_name, department, time, return_time, garage, passengers, start_km, status, end_km, mileage, returned_at, usage_type, note, vehicles(id, name, number, current_km, fuel)')
    .eq('user_name', user.name)
    .order('time', { ascending: false });

  if (mode === 'return') {
    // approved(출차 전) + in_use(사용 중) 모두 반납 가능
    query = query.in('status', ['approved', 'in_use']).is('returned_at', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: `예약 조회 오류: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ reservations: data ?? [], user });
}
