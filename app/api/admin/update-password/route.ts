/**
 * POST /api/admin/update-password
 * 관리자 비밀번호 초기화 또는 직접 변경
 * Headers: Authorization: Bearer {access_token}
 * Body:
 *   { action: 'reset',  target_auth_id }              → 임시비밀번호로 초기화
 *   { action: 'change', target_auth_id, new_password } → 직접 변경
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

// 비밀번호 초기화 시 사용할 임시 비밀번호 패턴: Hune + 사번 4자리
const DEFAULT_TEMP_PASSWORD = 'Hune2026!';

export async function POST(req: NextRequest) {
  // 1. 관리자 인증 (X-Admin-Id 헤더)
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { action, target_auth_id, new_password } = await req.json();

  if (!target_auth_id) {
    return NextResponse.json({ error: 'target_auth_id가 필요합니다.' }, { status: 400 });
  }

  // 2. 대상 사용자 존재 확인
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('name, employee_id')
    .eq('auth_id', target_auth_id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: '해당 사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 3. 비밀번호 초기화
  if (action === 'reset') {
    const tempPw = DEFAULT_TEMP_PASSWORD;

    const { error } = await supabaseAdmin.auth.admin.updateUser(target_auth_id, {
      password: tempPw,
    });
    if (error) {
      return NextResponse.json({ error: `비밀번호 초기화 실패: ${error.message}` }, { status: 500 });
    }

    // must_change_password = true 설정
    await supabaseAdmin
      .from('users')
      .update({ must_change_password: true })
      .eq('auth_id', target_auth_id);

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} (${targetUser.employee_id}) 비밀번호가 초기화되었습니다.`,
      temp_password: tempPw,
    });
  }

  // 4. 비밀번호 직접 변경
  if (action === 'change') {
    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUser(target_auth_id, {
      password: new_password,
    });
    if (error) {
      return NextResponse.json({ error: `비밀번호 변경 실패: ${error.message}` }, { status: 500 });
    }

    // must_change_password = true (관리자가 변경했으므로 다음 로그인 시 재변경)
    await supabaseAdmin
      .from('users')
      .update({ must_change_password: true })
      .eq('auth_id', target_auth_id);

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} (${targetUser.employee_id}) 비밀번호가 변경되었습니다.`,
    });
  }

  return NextResponse.json({ error: 'action은 reset 또는 change여야 합니다.' }, { status: 400 });
}
