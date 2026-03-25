/**
 * /api/admin/reservations
 * GET   → 예약 목록 (query: status=all|pending|approved|...)
 * PATCH → 상태 변경 (approve/reject) + 이메일 발송
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

// ── GET: 예약 목록
export async function GET(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');

  let query = supabaseAdmin
    .from('reservations')
    .select('*, vehicles(*)')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reservations: data ?? [] });
}

// ── PATCH: 예약 승인/반려
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id, action, reject_reason } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id와 action이 필요합니다.' }, { status: 400 });

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { data: reservation, error: fetchErr } = await supabaseAdmin
    .from('reservations')
    .select('*, vehicles(*)')
    .eq('id', id)
    .single();

  if (fetchErr || !reservation) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 이메일 주소 조회 (users 테이블에서 service_role로)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('name', reservation.user_name)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    userEmail: user?.email ?? null,
    reservation,
  });
}
