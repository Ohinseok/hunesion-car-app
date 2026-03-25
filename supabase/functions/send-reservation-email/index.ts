import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'onboarding@resend.dev';

interface EmailPayload {
  type: 'approved' | 'rejected';
  to: string;
  user_name: string;
  department: string;
  vehicle_name: string;
  vehicle_number: string;
  time: string;
  return_time: string;
  garage: string;
  reject_reason?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getApprovedHtml(p: EmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- 헤더 -->
    <div style="background:#4f46e5;padding:32px 36px;">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">HUNESION 차량 예약 시스템</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">예약이 승인되었습니다 ✅</h1>
    </div>

    <!-- 본문 -->
    <div style="padding:32px 36px;">
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
        안녕하세요, <strong>${p.user_name}</strong>님 (${p.department})<br>
        차량 예약이 <strong style="color:#4f46e5;">승인</strong>되었습니다.
      </p>

      <!-- 예약 정보 카드 -->
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;width:90px;">차량</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:600;">${p.vehicle_name} (${p.vehicle_number})</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">차고지</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;border-top:1px solid #e5e7eb;">${p.garage}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">출발</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;border-top:1px solid #e5e7eb;">${formatDate(p.time)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">반납 예정</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;border-top:1px solid #e5e7eb;">${formatDate(p.return_time)}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        차량 이용 후 반드시 <strong>차량 반납</strong>을 완료해주세요.<br>
        문의사항은 경영지원본부 인사총무팀으로 연락해주세요.
      </p>
    </div>

    <!-- 푸터 -->
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        본 메일은 HUNESION 차량 예약 시스템에서 자동 발송되었습니다.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function getRejectedHtml(p: EmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- 헤더 -->
    <div style="background:#dc2626;padding:32px 36px;">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">HUNESION 차량 예약 시스템</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">예약이 반려되었습니다 ❌</h1>
    </div>

    <!-- 본문 -->
    <div style="padding:32px 36px;">
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
        안녕하세요, <strong>${p.user_name}</strong>님 (${p.department})<br>
        아래 예약 건이 <strong style="color:#dc2626;">반려</strong>되었습니다.
      </p>

      <!-- 예약 정보 카드 -->
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;width:90px;">차량</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:600;">${p.vehicle_name} (${p.vehicle_number})</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">출발</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;border-top:1px solid #e5e7eb;">${formatDate(p.time)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">반납 예정</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;border-top:1px solid #e5e7eb;">${formatDate(p.return_time)}</td>
          </tr>
        </table>
      </div>

      ${p.reject_reason ? `
      <!-- 반려 사유 -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 6px;color:#dc2626;font-size:13px;font-weight:600;">반려 사유</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${p.reject_reason}</p>
      </div>` : ''}

      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        다시 예약하시려면 차량 예약 시스템에서 새 예약을 신청해주세요.<br>
        문의사항은 경영지원본부 인사총무팀으로 연락해주세요.
      </p>
    </div>

    <!-- 푸터 -->
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        본 메일은 HUNESION 차량 예약 시스템에서 자동 발송되었습니다.
      </p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { type, to, ...rest } = payload;

    const subject = type === 'approved'
      ? `[휴네시온] 차량 예약이 승인되었습니다 - ${rest.vehicle_name}`
      : `[휴네시온] 차량 예약이 반려되었습니다 - ${rest.vehicle_name}`;

    const html = type === 'approved'
      ? getApprovedHtml(payload)
      : getRejectedHtml(payload);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || '이메일 발송 실패');
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}); 