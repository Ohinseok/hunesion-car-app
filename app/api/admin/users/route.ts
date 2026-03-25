/**
 * /api/admin/users
 * GET   → 사용자 목록
 * PATCH → role 또는 is_active 변경 (body: { id, field, value })
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

// ── GET: 사용자 목록
export async function GET(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

// ── PATCH: 역할/활성 상태 변경
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id, field, value } = await req.json();

  if (!id || !field) return NextResponse.json({ error: 'id와 field가 필요합니다.' }, { status: 400 });
  if (!['role', 'is_active'].includes(field)) return NextResponse.json({ error: '변경 가능한 필드: role, is_active' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('users')
    .update({ [field]: value })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
