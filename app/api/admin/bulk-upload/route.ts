/**
 * POST /api/admin/bulk-upload
 * 엑셀에서 파싱된 직원 데이터를 일괄 등록
 * Headers: Authorization: Bearer {access_token}
 * Body: { rows: Array<{ name, employee_id, email, department, temp_password }> }
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminId } from '@/lib/supabase-admin';

const MAX_ROWS = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UploadRow {
  name: string;
  employee_id: string;
  email: string;
  department?: string;
  temp_password: string;
}

interface RowResult {
  row: number;
  name: string;
  employee_id: string;
  email: string;
  status: 'success' | 'failed';
  reason?: string;
}

export async function POST(req: NextRequest) {
  // 1. 관리자 인증 (X-Admin-Id 헤더)
  const auth = await verifyAdminId(req.headers.get('x-admin-id'));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { rows }: { rows: UploadRow[] } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '업로드할 데이터가 없습니다.' }, { status: 400 });
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `최대 ${MAX_ROWS}건까지 업로드 가능합니다.` }, { status: 400 });
  }

  // 2. 기존 사번/이메일 목록 조회 (중복 검사용)
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('employee_id, email');

  const existEmpIds = new Set((existingUsers || []).map((u) => u.employee_id));
  const existEmails = new Set((existingUsers || []).map((u) => u.email));

  const results: RowResult[] = [];
  const uploadEmpIds = new Set<string>(); // 이번 업로드 내 사번 중복
  const uploadEmails = new Set<string>(); // 이번 업로드 내 이메일 중복

  // 3. 행별 처리
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // 엑셀 행 번호 (헤더=1)

    // ─ 필수값 검증
    if (!r.name?.trim() || !r.employee_id?.trim() || !r.email?.trim() || !r.temp_password?.trim()) {
      results.push({ row: rowNum, name: r.name||'', employee_id: r.employee_id||'', email: r.email||'', status: 'failed', reason: '필수값 누락 (이름/사번/이메일/임시비밀번호)' });
      continue;
    }

    const name        = r.name.trim();
    const employee_id = r.employee_id.trim();
    const email       = r.email.trim().toLowerCase();
    const department  = r.department?.trim() || null;
    const temp_password = r.temp_password.trim();

    // ─ 이메일 형식
    if (!EMAIL_REGEX.test(email)) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: '이메일 형식 오류' });
      continue;
    }

    // ─ 비밀번호 길이
    if (temp_password.length < 6) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: '임시비밀번호 6자 이상 필요' });
      continue;
    }

    // ─ 기존 DB 중복
    if (existEmpIds.has(employee_id)) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: `사번 중복 (기존 DB)` });
      continue;
    }
    if (existEmails.has(email)) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: `이메일 중복 (기존 DB)` });
      continue;
    }

    // ─ 업로드 내 중복
    if (uploadEmpIds.has(employee_id)) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: '사번 중복 (파일 내 중복)' });
      continue;
    }
    if (uploadEmails.has(email)) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: '이메일 중복 (파일 내 중복)' });
      continue;
    }

    // ─ Auth 계정 생성
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { name, employee_id },
    });

    if (authErr || !authData.user) {
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: `Auth 생성 실패: ${authErr?.message}` });
      continue;
    }

    // ─ DB insert
    const { error: dbErr } = await supabaseAdmin.from('users').insert({
      auth_id: authData.user.id,
      name, employee_id, email, department,
      role: 'user',
      is_active: true,
      must_change_password: true,
    });

    if (dbErr) {
      // 롤백
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      results.push({ row: rowNum, name, employee_id, email, status: 'failed', reason: `DB 저장 실패 (롤백됨): ${dbErr.message}` });
      continue;
    }

    // ─ 성공 처리
    uploadEmpIds.add(employee_id);
    uploadEmails.add(email);
    existEmpIds.add(employee_id); // 다음 행 중복 방지
    existEmails.add(email);

    results.push({ row: rowNum, name, employee_id, email, status: 'success' });
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount  = results.filter((r) => r.status === 'failed').length;

  // 4. 업로드 로그 저장
  await supabaseAdmin.from('bulk_upload_logs').insert({
    uploaded_by: auth.employeeId,
    total: rows.length,
    success: successCount,
    failed: failedCount,
    detail: results,
  });

  return NextResponse.json({ success: true, total: rows.length, successCount, failedCount, results });
}
