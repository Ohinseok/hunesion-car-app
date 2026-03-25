/**
 * POST /api/reservations/cancel
 * 예약 취소: pending 또는 approved → cancelled
 * Body: { reservation_id }
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { reservation_id } = await req.json();

  if (!reservation_id) {
    return NextResponse.json({ error: '예약 ID가 필요합니다.' }, { status: 400 });
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, status')
    .eq('id', reservation_id)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!['pending', 'approved'].includes(reservation.status)) {
    return NextResponse.json({ error: '대기 또는 승인 상태의 예약만 취소할 수 있습니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservation_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
