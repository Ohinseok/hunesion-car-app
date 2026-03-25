'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Reservation {
  id: number;
  user_name: string;
  department: string;
  time: string;
  return_time: string;
  garage: string;
  passengers: string;
  start_km: number | null;
  status: string;
  vehicles: {
    id: number;
    name: string;
    number: string;
    current_km: number;
    fuel?: string;
  };
}

type Step = 'search' | 'select' | 'checkin' | 'confirm_km' | 'input_km' | 'done';

export default function ReturnPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [confirmedStartKm, setConfirmedStartKm] = useState<number>(0);
  const [endKm, setEndKm] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<Step>('search');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // ── STEP 1: 사원번호로 예약 조회 ─────────────────────────────────
  const handleSearch = async () => {
    if (!employeeId.trim()) { setError('사원번호를 입력해주세요.'); return; }
    setLoading(true);
    setError('');

    const res = await fetch(`/api/reservations/by-employee?employee_id=${encodeURIComponent(employeeId.trim())}&mode=return`);
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || '사원번호를 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    const data = json.reservations ?? [];
    if (data.length === 0) {
      setError('처리할 수 있는 예약이 없습니다. (승인 또는 사용 중인 예약만 가능합니다)');
      setLoading(false);
      return;
    }

    setReservations(data.map((r: any) => ({
      ...r,
      vehicles: Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles,
    })) as Reservation[]);
    setStep('select');
    setLoading(false);
  };

  // ── STEP 2: 예약 선택 ─────────────────────────────────────────────
  const handleSelectReservation = (res: Reservation) => {
    setSelected(res);
    setError('');
    if (res.status === 'approved') {
      // 아직 출차 안 한 경우 → 출차확인 단계로
      setStep('checkin');
    } else {
      // in_use: 이미 출차된 경우 → 바로 km 확인으로
      const km = res.start_km ?? res.vehicles.current_km;
      setConfirmedStartKm(km);
      setStep('confirm_km');
    }
  };

  // ── STEP 3 (선택): 출차확인 ───────────────────────────────────────
  const handleCheckin = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/reservations/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: selected.id }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || '출차 확인 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }

    // 로컬 상태 업데이트 (status → in_use)
    const updated = { ...selected, status: 'in_use' };
    setSelected(updated);
    const km = updated.start_km ?? updated.vehicles.current_km;
    setConfirmedStartKm(km);
    setStep('confirm_km');
    setLoading(false);
  };

  // ── 미사용 반납 (출차도 안 하고 반납) ────────────────────────────
  const handleUnusedReturn = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/reservations/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: selected.id, usage_type: 'unused', note: note || null }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || '반납 처리 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }
    setStep('done');
    setLoading(false);
  };

  // ── STEP 4: 출발 km 확인 완료 → 도착 km 입력 ─────────────────────
  const handleConfirmKm = () => {
    setEndKm('');
    setNote('');
    setError('');
    setStep('input_km');
  };

  // ── STEP 5: 반납 처리 ─────────────────────────────────────────────
  const handleReturn = async () => {
    if (!selected) return;
    const endKmNum = parseInt(endKm, 10);
    if (!endKm || isNaN(endKmNum)) { setError('도착 km를 입력해주세요.'); return; }
    if (endKmNum < confirmedStartKm) {
      setError(`도착 km(${endKmNum})는 출발 km(${confirmedStartKm})보다 작을 수 없습니다.`);
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/reservations/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: selected.id, start_km: confirmedStartKm, end_km: endKmNum, note: note || null, usage_type: 'used' }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || '반납 처리 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }
    setStep('done');
    setLoading(false);
  };

  const handleReset = () => {
    setEmployeeId('');
    setReservations([]);
    setSelected(null);
    setConfirmedStartKm(0);
    setEndKm('');
    setNote('');
    setError('');
    setStep('search');
  };

  // 진행 바 계산
  const steps: Step[] = selected?.status === 'in_use' || step === 'confirm_km' || step === 'input_km' || step === 'done'
    ? ['search', 'select', 'confirm_km', 'input_km']
    : ['search', 'select', 'checkin', 'confirm_km', 'input_km'];
  const stepIdx = steps.indexOf(step);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '480px', padding: '36px 32px' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>🚗 차량 출차 / 반납</h1>
            <Link href="/" style={{ fontSize: '13px', color: '#9ca3af', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none' }}>
              ← 메인으로
            </Link>
          </div>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>
            {step === 'search'     && '사원번호를 입력하여 예약을 조회하세요'}
            {step === 'select'     && '처리할 예약을 선택하세요'}
            {step === 'checkin'    && '출차를 확인해주세요'}
            {step === 'confirm_km' && '출발 km를 확인해주세요'}
            {step === 'input_km'   && '도착 km를 입력해주세요'}
            {step === 'done'       && '처리가 완료되었습니다'}
          </p>
        </div>

        {/* 진행 단계 */}
        {step !== 'done' && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
            {steps.map((s, i) => (
              <div key={s} style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: stepIdx >= i ? '#4f46e5' : '#e5e7eb',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: 사원번호 입력 */}
        {step === 'search' && (
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>사원번호</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="사원번호 입력"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '16px', width: '100%', padding: '13px', background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '조회 중...' : '예약 조회'}
            </button>
          </form>
        )}

        {/* STEP 2: 예약 선택 */}
        {step === 'select' && (
          <div>
            {reservations.map(res => {
              const isInUse = res.status === 'in_use';
              return (
                <div
                  key={res.id}
                  onClick={() => handleSelectReservation(res)}
                  style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#4f46e5'; (e.currentTarget as HTMLDivElement).style.background = '#f5f3ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLDivElement).style.background = '#fff'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e', margin: '0 0 4px' }}>{res.vehicles.name}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>{res.vehicles.number}</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                        {formatDate(res.time)} → {formatDate(res.return_time)}
                      </p>
                    </div>
                    {isInUse ? (
                      <span style={{ background: '#f5f3ff', color: '#7c3aed', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>사용 중 → 반납</span>
                    ) : (
                      <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>승인 → 출차</span>
                    )}
                  </div>
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#6b7280' }}>
                    차고지: {res.garage} | 현재 km: <strong>{res.vehicles.current_km.toLocaleString()} km</strong>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={handleReset} style={{ width: '100%', padding: '11px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
              ← 처음으로
            </button>
          </div>
        )}

        {/* STEP 3 (선택): 출차 확인 */}
        {step === 'checkin' && selected && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>출차 차량</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 10px' }}>
                {selected.vehicles.name} <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400' }}>({selected.vehicles.number})</span>
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>예약 시간</p>
              <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 10px' }}>
                {formatDate(selected.time)} ~ {formatDate(selected.return_time)}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>차고지</p>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>{selected.garage}</p>
            </div>

            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', textAlign: 'center' }}>
              출차를 확인하면 상태가 <strong style={{ color: '#7c3aed' }}>사용 중</strong>으로 변경됩니다.
            </p>

            <button type="button"
              onClick={handleCheckin}
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '10px' }}
            >
              {loading ? '처리 중...' : '🚀 출차 확인'}
            </button>

            <button type="button"
              onClick={handleUnusedReturn}
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '10px' }}
            >
              미사용 반납 (차량 사용 안 함)
            </button>

            <button type="button" onClick={() => setStep('select')} style={{ width: '100%', padding: '11px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              ← 예약 선택으로
            </button>
          </div>
        )}

        {/* STEP 4: 출발 km 확인 */}
        {step === 'confirm_km' && selected && (
          <div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>차량</p>
              <p style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 14px' }}>{selected.vehicles.name} ({selected.vehicles.number})</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>시스템에 등록된 출발 km</p>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#4f46e5', margin: 0 }}>{confirmedStartKm.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: '500' }}>km</span></p>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>실제 계기판과 다를 경우 수정해주세요</p>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>출발 km 확인/수정</label>
            <input
              type="number"
              value={confirmedStartKm}
              onChange={e => setConfirmedStartKm(parseInt(e.target.value, 10) || 0)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button type="button"
              onClick={handleConfirmKm}
              style={{ marginTop: '16px', width: '100%', padding: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
            >
              확인 완료 → 반납 입력
            </button>
            <button type="button"
              onClick={handleUnusedReturn}
              disabled={loading}
              style={{ marginTop: '10px', width: '100%', padding: '11px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              미사용 반납
            </button>
            <button type="button" onClick={() => setStep('select')} style={{ marginTop: '10px', width: '100%', padding: '11px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              ← 예약 선택으로
            </button>
          </div>
        )}

        {/* STEP 5: 도착 km 입력 */}
        {step === 'input_km' && selected && (
          <div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 2px' }}>출발 km</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#374151', margin: 0 }}>{confirmedStartKm.toLocaleString()} km</p>
              </div>
              <div style={{ fontSize: '20px', color: '#9ca3af' }}>→</div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 2px' }}>주행거리</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: endKm && parseInt(endKm) >= confirmedStartKm ? '#059669' : '#9ca3af', margin: 0 }}>
                  {endKm && parseInt(endKm) >= confirmedStartKm ? `+${(parseInt(endKm) - confirmedStartKm).toLocaleString()} km` : '- km'}
                </p>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>도착 km <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="number"
              value={endKm}
              onChange={e => { setEndKm(e.target.value); setError(''); }}
              placeholder={`${confirmedStartKm} 이상 입력`}
              style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${error ? '#fca5a5' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = error ? '#fca5a5' : '#e5e7eb'}
            />

            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px', marginTop: '16px' }}>특이사항 <span style={{ color: '#9ca3af', fontWeight: '400' }}>(선택)</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="연료 부족, 차량 이상 등 특이사항이 있으면 입력해주세요"
              rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />

            <button type="button"
              onClick={handleReturn}
              disabled={loading}
              style={{ marginTop: '20px', width: '100%', padding: '13px', background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '처리 중...' : '반납 완료'}
            </button>
            <button type="button" onClick={() => setStep('confirm_km')} style={{ marginTop: '10px', width: '100%', padding: '11px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              ← 출발 km 수정
            </button>
          </div>
        )}

        {/* STEP 6: 완료 */}
        {step === 'done' && selected && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>
              {endKm ? '반납 완료!' : '미사용 반납 완료!'}
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>{selected.vehicles.name} ({selected.vehicles.number})</p>
            {endKm ? (
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '18px', textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>출발 km</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{confirmedStartKm.toLocaleString()} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>도착 km</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{parseInt(endKm).toLocaleString()} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>총 주행거리</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#4f46e5' }}>{(parseInt(endKm) - confirmedStartKm).toLocaleString()} km</span>
                </div>
                {note && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>특이사항: </span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{note}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '14px', marginBottom: '24px', fontSize: '14px', color: '#c2410c' }}>
                미사용으로 반납 처리되었습니다
              </div>
            )}
            <button
              type="button"
              onClick={handleReset}
              style={{ width: '100%', padding: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '10px' }}
            >
              한 번 더 처리하기
            </button>
            <Link href="/" style={{ display: 'block', width: '100%', padding: '13px', background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
              🏠 메인으로
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
