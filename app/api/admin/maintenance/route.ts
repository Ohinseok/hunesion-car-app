/**
 * /api/admin/maintenance
 * GET    → 정비 이력 목록
 * POST   → 정비 이력 추가
 * DELETE → 정비 이력 삭제 (body: { id })
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

// ── GET: 정비 이력
export async function GET(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('maintenance')
    .select('*, vehicles(name, number)')
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ maintenance: data ?? [] });
}

// ── POST: 정비 이력 추가
export async function POST(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { vehicle_id, date, description, cost } = await req.json();
  if (!vehicle_id || !date || !description) {
    return NextResponse.json({ error: '차량, 날짜, 정비내용은 필수입니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('maintenance')
    .insert([{ vehicle_id, date, description, cost: cost || 0 }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ── DELETE: 정비 이력 삭제
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('maintenance').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
