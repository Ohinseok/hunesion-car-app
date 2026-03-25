'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Reservation {
  id: number;
  user_name: string;
  department: string;
  time: string;
  return_time: string;
  garage: string;
  passengers: string;
  status: string;
  start_km: number | null;
  end_km: number | null;
  mileage: number | null;
  note: string | null;
  returned_at: string | null;
  usage_type: string;
  created_at: string;
  vehicles?: {
    name: string;
    number: string;
    fuel: string;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '승인 대기',  color: '#d97706', bg: '#fffbeb' },
  approved:  { label: '승인 완료',  color: '#059669', bg: '#ecfdf5' },
  in_use:    { label: '사용 중',    color: '#7c3aed', bg: '#f5f3ff' },
  returned:  { label: '반납 완료',  color: '#2563eb', bg: '#eff6ff' },
  rejected:  { label: '반려',       color: '#dc2626', bg: '#fef2f2' },
  cancelled: { label: '취소',       color: '#6b7280', bg: '#f3f4f6' },
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function MyReservationsPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [userName, setUserName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!employeeId.trim()) { setError('사원번호를 입력해주세요.'); return; }
    setLoading(true);
    setError('');

    const res = await fetch(`/api/reservations/by-employee?employee_id=${encodeURIComponent(employeeId.trim())}&mode=history`);
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || '등록되지 않은 사원번호입니다.');
      setLoading(false);
      return;
    }

    setUserName(json.user.name);
    setReservations((json.reservations as Reservation[]) || []);
    setSearched(true);
    setLoading(false);
  };

  const handleCancel = async (reservationId: number) => {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    setCancellingId(reservationId);

    const res = await fetch('/api/reservations/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: reservationId }),
    });
    const json = await res.json();

    if (!res.ok) {
      alert(json.error || '취소 처리 중 오류가 발생했습니다.');
      setCancellingId(null);
      return;
    }

    // 로컬 상태 업데이트
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelled' } : r));
    setCancellingId(null);
  };

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

  const counts = {
    all:       reservations.length,
    pending:   reservations.filter(r => r.status === 'pending').length,
    approved:  reservations.filter(r => r.status === 'approved').length,
    in_use:    reservations.filter(r => r.status === 'in_use').length,
    returned:  reservations.filter(r => r.status === 'returned').length,
    rejected:  reservations.filter(r => r.status === 'rejected').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-block text-sm text-gray-400 mb-4 active:text-gray-600">
          ← 메인으로
        </Link>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">📋 내 예약 확인</h2>
          <p className="text-sm text-gray-400 mb-5 text-center">사원번호를 입력하면 예약 현황을 확인할 수 있습니다</p>

          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={employeeId}
              onChange={e => { setEmployeeId(e.target.value); setError(''); }}
              placeholder="사원번호 입력"
              autoComplete="off"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-500 text-white px-5 rounded-lg text-sm font-semibold active:bg-indigo-600 transition disabled:bg-gray-300"
            >
              {loading ? '조회중' : '조회'}
            </button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {searched && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">
                <span className="text-indigo-600">{userName}</span>님의 예약 내역
                <span className="text-gray-400 font-normal ml-1">총 {reservations.length}건</span>
              </p>
            </div>

            {/* 필터 탭 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'all',       label: `전체 ${counts.all}` },
                { key: 'pending',   label: `대기 ${counts.pending}` },
                { key: 'approved',  label: `승인 ${counts.approved}` },
                { key: 'in_use',    label: `사용중 ${counts.in_use}` },
                { key: 'returned',  label: `반납 ${counts.returned}` },
                { key: 'rejected',  label: `반려 ${counts.rejected}` },
                { key: 'cancelled', label: `취소 ${counts.cancelled}` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === tab.key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-400 text-sm">
                해당 조건의 예약 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(r => {
                  const st = STATUS_MAP[r.status] || { label: r.status, color: '#6b7280', bg: '#f9fafb' };
                  const canCancel = r.status === 'pending' || r.status === 'approved';
                  return (
                    <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                      {/* 상단: 상태 + 날짜 */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(r.created_at)} 신청</span>
                      </div>

                      {/* 차량 정보 */}
                      {r.vehicles && (
                        <p className="font-bold text-gray-800 mb-1">
                          🚗 {r.vehicles.name} <span className="text-gray-400 font-normal text-sm">({r.vehicles.number})</span>
                        </p>
                      )}

                      {/* 시간 */}
                      <p className="text-sm text-gray-600 mb-1">
                        📅 {formatDate(r.time)} ~ {formatDate(r.return_time)}
                      </p>

                      {/* 차고지 */}
                      <p className="text-sm text-gray-500">📍 {r.garage}</p>

                      {/* 동승자 */}
                      {r.passengers && (
                        <p className="text-sm text-gray-500">👥 동승자: {r.passengers}</p>
                      )}

                      {/* 반납 완료 정보 */}
                      {r.status === 'returned' && r.mileage != null && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                          <span>출발 {r.start_km?.toLocaleString()} km</span>
                          <span>도착 {r.end_km?.toLocaleString()} km</span>
                          <span className="font-semibold text-indigo-600">주행 {r.mileage.toLocaleString()} km</span>
                          {r.usage_type === 'unused' && <span className="text-gray-400">(미사용 반납)</span>}
                        </div>
                      )}

                      {/* 특이사항 */}
                      {r.note && (
                        <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded p-2">📝 {r.note}</p>
                      )}

                      {/* 예약 취소 버튼 */}
                      {canCancel && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleCancel(r.id)}
                            disabled={cancellingId === r.id}
                            className="text-xs text-red-400 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {cancellingId === r.id ? '취소 처리 중...' : '예약 취소'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
