'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Vehicle {
  id: number;
  name: string;
  number: string;
  fuel: string;
  garage: string;
}

export default function ReservationPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [userName, setUserName]     = useState('');
  const [department, setDepartment] = useState('');
  const [lookupDone, setLookupDone] = useState(false);

  const [time, setTime]           = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [garage, setGarage]       = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [passengers, setPassengers] = useState('');

  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(json => { if (json.vehicles) setVehicles(json.vehicles); })
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));
  }, []);

  // ── 사원번호 자동 조회 (입력 후 800ms 뒤 자동 실행) ───────────
  useEffect(() => {
    const id = employeeId.trim();
    if (!id) {
      setUserName(''); setDepartment(''); setLookupDone(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch(`/api/user/lookup?employee_id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (res.ok && json.name) {
          setUserName(json.name);
          setDepartment(json.department ?? '');
          setLookupDone(true);
        } else {
          setUserName(''); setDepartment(''); setLookupDone(false);
        }
      } catch {
        setUserName(''); setDepartment(''); setLookupDone(false);
      } finally {
        setLookupLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [employeeId]);

  // ── 예약 제출 ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!lookupDone || !userName) { alert('사원번호 조회를 먼저 해주세요.'); return; }
    if (!time || !returnTime)     { alert('출발/반납 시간을 입력해주세요.'); return; }
    if (!garage)                  { alert('차고지를 선택해주세요.'); return; }
    if (!vehicleId)               { alert('차량을 선택해주세요.'); return; }
    if (returnTime <= time)       { alert('반납 시간은 출발 시간 이후여야 합니다.'); return; }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          department,
          time,
          return_time: returnTime,
          vehicle_id: Number(vehicleId),
          garage,
          passengers: passengers || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { alert('예약 실패: ' + json.error); return; }

      alert('✅ 예약이 완료되었습니다!');
      // 폼 초기화
      if (empInputRef.current) empInputRef.current.value = '';
      setUserName(''); setDepartment(''); setLookupDone(false);
      setTime(''); setReturnTime(''); setGarage(''); setVehicleId(''); setPassengers('');
    } catch {
      alert('예약 중 오류가 발생했습니다.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const garageOptions = [...new Set(['휴네시온 타워', ...vehicles.map(v => v.garage).filter(Boolean)])];
  const filteredVehicles = garage ? vehicles.filter(v => v.garage === garage) : vehicles;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-sm mx-auto">
        <Link href="/" className="inline-block text-sm text-gray-400 mb-4">← 메인으로</Link>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5 text-center">차량 예약</h2>

          <div className="space-y-4">

            {/* 사원번호 — 입력 후 자동 조회 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">사원번호</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="사원번호 입력 (자동 조회)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 pr-16"
                />
                {lookupLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">조회중...</span>
                )}
              </div>
              {lookupDone && (
                <p className="text-sm text-blue-600 mt-2 font-medium">✓ {userName} ({department})</p>
              )}
              {employeeId && !lookupDone && !lookupLoading && (
                <p className="text-xs text-gray-400 mt-1">사원번호를 다시 확인해주세요</p>
              )}
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">이름</label>
              <input
                type="text"
                value={userName}
                readOnly
                placeholder="사원번호 조회 후 자동 입력"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base bg-gray-100 text-gray-600"
              />
            </div>

            {/* 부서 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">부서</label>
              <input
                type="text"
                value={department}
                readOnly
                placeholder="사원번호 조회 후 자동 입력"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base bg-gray-100 text-gray-600"
              />
            </div>

            {/* 출발 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">출발 시간</label>
              <input
                type="datetime-local"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* 반납 예정 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">반납 예정 시간</label>
              <input
                type="datetime-local"
                value={returnTime}
                onChange={e => setReturnTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* 차고지 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">차고지</label>
              <select
                value={garage}
                onChange={e => { setGarage(e.target.value); setVehicleId(''); }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">선택하세요</option>
                {garageOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* 차량 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">차량 선택</label>
              {vehiclesLoading ? (
                <p className="text-sm text-gray-400 py-2">차량 목록 불러오는 중...</p>
              ) : (
                <select
                  value={vehicleId}
                  onChange={e => setVehicleId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">
                    {filteredVehicles.length === 0 && garage
                      ? '해당 차고지에 차량 없음'
                      : `선택하세요 (${filteredVehicles.length}대)`}
                  </option>
                  {filteredVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.number}) / {v.fuel}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 동승자 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                동승자 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={passengers}
                onChange={e => setPassengers(e.target.value)}
                placeholder="예: 김철수, 이영희"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitLoading}
            className="w-full mt-6 bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-base active:bg-blue-700 disabled:bg-gray-400"
          >
            {submitLoading ? '예약 중...' : '예약하기'}
          </button>
        </div>
      </div>
    </main>
  );
}
