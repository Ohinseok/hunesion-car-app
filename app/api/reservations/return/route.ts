/**
 * POST /api/reservations/return
 * 차량 반납 처리 (service_role → RLS 우회)
 * Body: { reservation_id, start_km, end_km, note?, usage_type? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { reservation_id, start_km, end_km, note, usage_type = 'used' } = await req.json();

  if (!reservation_id) {
    return NextResponse.json({ error: '예약 ID가 필요합니다.' }, { status: 400 });
  }

  // 1. 예약 존재 + 상태 확인
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, status, vehicle_id')
    .eq('id', reservation_id)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!['approved', 'in_use'].includes(reservation.status)) {
    return NextResponse.json({ error: '승인 또는 사용 중 상태의 예약만 반납할 수 있습니다.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (usage_type === 'unused') {
    // 미사용 반납 (km 입력 없음)
    const { error } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'returned', returned_at: now, usage_type: 'unused', note: note || null })
      .eq('id', reservation_id);

    if (error) {
      return NextResponse.json({ error: `반납 처리 실패: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // 정상 반납 — km 유효성 검사
  if (start_km == null || end_km == null) {
    return NextResponse.json({ error: '출발/도착 km를 입력해주세요.' }, { status: 400 });
  }
  if (end_km < start_km) {
    return NextResponse.json({ error: '도착 km가 출발 km보다 작을 수 없습니다.' }, { status: 400 });
  }

  const mileage = end_km - start_km;

  // 2. 예약 업데이트
  const { error: resErr } = await supabaseAdmin
    .from('reservations')
    .update({
      start_km,
      end_km,
      mileage,
      note: note || null,
      returned_at: now,
      status: 'returned',
      usage_type: 'used',
    })
    .eq('id', reservation_id);

  if (resErr) {
    return NextResponse.json({ error: `반납 처리 실패: ${resErr.message}` }, { status: 500 });
  }

  // 3. 차량 current_km 업데이트
  const { error: vehicleErr } = await supabaseAdmin
    .from('vehicles')
    .update({ current_km: end_km })
    .eq('id', reservation.vehicle_id);

  if (vehicleErr) {
    return NextResponse.json({ error: `차량 km 업데이트 실패: ${vehicleErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, mileage });
}
