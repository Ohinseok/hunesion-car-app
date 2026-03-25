/**
 * POST /api/reservations/create
 * 차량 예약 등록 (service_role → RLS 우회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { user_name, department, time, return_time, vehicle_id, garage, passengers } = await req.json();

  if (!user_name || !department || !time || !return_time || !vehicle_id || !garage) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  // 차량 시간 중복 체크
  const { data: vehicleConflict } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('vehicle_id', vehicle_id)
    .in('status', ['pending', 'approved', 'in_use'])
    .lt('time', return_time)
    .gt('return_time', time);

  if (vehicleConflict && vehicleConflict.length > 0) {
    return NextResponse.json({ error: '해당 시간대에 이미 예약된 차량입니다. 다른 시간 또는 차량을 선택해주세요.' }, { status: 409 });
  }

  // 동일 사용자 시간 중복 체크
  const { data: userConflict } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('user_name', user_name)
    .in('status', ['pending', 'approved', 'in_use'])
    .lt('time', return_time)
    .gt('return_time', time);

  if (userConflict && userConflict.length > 0) {
    return NextResponse.json({ error: '해당 시간대에 이미 다른 차량을 예약하셨습니다. 1인 1차량만 예약 가능합니다.' }, { status: 409 });
  }

  // 예약 등록
  const { error } = await supabaseAdmin.from('reservations').insert([{
    user_name,
    department,
    time,
    return_time,
    vehicle_id,
    garage,
    passengers: passengers || null,
  }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
