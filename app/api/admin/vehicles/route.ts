/**
 * /api/admin/vehicles
 * GET    → 차량 목록 조회
 * POST   → 차량 추가
 * PATCH  → 차량 수정  (body: { id, ...fields })
 * DELETE → 차량 삭제  (body: { id })
 * 관리자 인증: X-Admin-Id 헤더
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

// ── GET: 차량 목록 (인증 불필요 - 예약 페이지에서도 사용)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .order('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicles: data ?? [] });
}

// ── POST: 차량 추가
export async function POST(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { name, number, fuel, garage, current_km } = await req.json();
  if (!name || !number) return NextResponse.json({ error: '차량명과 차량번호는 필수입니다.' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .insert([{ name, number, fuel: fuel || '휘발유', garage: garage || '휴네시온 타워', current_km: current_km || 0 }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicle: data });
}

// ── PATCH: 차량 수정
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id, name, number, fuel, garage, current_km } = await req.json();
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('vehicles')
    .update({ name, number, fuel, garage, current_km })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ── DELETE: 차량 삭제
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('vehicles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
