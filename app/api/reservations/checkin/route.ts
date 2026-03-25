/**
 * POST /api/reservations/checkin
 * 출차 확인: approved → in_use
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
  if (reservation.status !== 'approved') {
    return NextResponse.json({ error: '승인된 예약만 출차 확인할 수 있습니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'in_use' })
    .eq('id', reservation_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
