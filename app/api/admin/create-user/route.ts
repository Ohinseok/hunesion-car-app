/**
 * POST /api/admin/create-user
 * 관리자가 직원 계정을 단건 생성
 * Headers: Authorization: Bearer {access_token}
 * Body: { name, employee_id, email, department, temp_password, role? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  // 1. 관리자 인증 (X-Admin-Id 헤더)
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // 2. 요청 파싱
  const { name, employee_id, email, department, temp_password, role = 'user' } = await req.json();

  // 3. 필수값 검증
  if (!name || !employee_id || !email || !temp_password) {
    return NextResponse.json(
      { error: '이름, 사번, 이메일, 임시비밀번호는 필수입니다.' },
      { status: 400 }
    );
  }

  // 4. 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
  }

  // 5. 임시비밀번호 최소 길이 검증 (Supabase Auth 최소 6자)
  if (temp_password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }

  // 6. 사번 중복 검사
  const { data: existEmp } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('employee_id', employee_id)
    .single();
  if (existEmp) {
    return NextResponse.json({ error: `사번 '${employee_id}' 이(가) 이미 존재합니다.` }, { status: 409 });
  }

  // 7. 이메일 중복 검사
  const { data: existEmail } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  if (existEmail) {
    return NextResponse.json({ error: `이메일 '${email}' 이(가) 이미 존재합니다.` }, { status: 409 });
  }

  // 8. Supabase Auth 계정 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,   // 이메일 인증 건너뜀
    user_metadata: { name, employee_id },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: `Auth 계정 생성 실패: ${authError?.message}` },
      { status: 500 }
    );
  }

  // 9. users 테이블 insert
  const { error: dbError } = await supabaseAdmin.from('users').insert({
    auth_id: authData.user.id,
    name,
    employee_id,
    email,
    department: department || null,
    role,
    is_active: true,
    must_change_password: true,
  });

  if (dbError) {
    // 롤백: Auth 계정 삭제
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: `DB 저장 실패 (롤백됨): ${dbError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${name} (${employee_id}) 계정이 생성되었습니다.`,
    auth_id: authData.user.id,
  });
}
