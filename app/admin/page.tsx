'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// ─── 타입 ─────────────────────────────────────────────
interface Vehicle {
  id: number; name: string; number: string; fuel: string; garage: string; current_km: number;
}
interface User {
  id: number; auth_id: string; name: string; department: string; employee_id: string;
  email: string; role: string; is_active: boolean; must_change_password: boolean; created_at: string;
}
interface Reservation {
  id: number; user_name: string; department: string; time: string; return_time: string;
  garage: string; vehicle_id: number; passengers: string; status: string;
  start_km: number|null; end_km: number|null; mileage: number|null;
  note: string|null; returned_at: string|null; usage_type: string; created_at: string;
  vehicles?: Vehicle;
}
interface Maintenance {
  id: number; vehicle_id: number; date: string; description: string; cost: number; created_at: string;
  vehicles?: { name: string; number: string };
}

// ─── 이메일 발송 ───────────────────────────────────────
async function sendEmail(type: 'approved'|'rejected', reservation: Reservation, userEmail: string, rejectReason?: string) {
  try {
    const { error } = await supabase.functions.invoke('send-reservation-email', {
      body: {
        type, to: userEmail,
        user_name: reservation.user_name, department: reservation.department,
        vehicle_name: reservation.vehicles?.name ?? '', vehicle_number: reservation.vehicles?.number ?? '',
        time: reservation.time, return_time: reservation.return_time,
        garage: reservation.garage, reject_reason: rejectReason,
      },
    });
    if (error) console.error('이메일 발송 실패:', error);
  } catch (err) { console.error('이메일 호출 오류:', err); }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ─── 상태 뱃지 ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
    returned: 'bg-blue-100 text-blue-700',  in_use: 'bg-purple-100 text-purple-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  const labels: Record<string, string> = {
    approved:'승인', rejected:'반려', returned:'반납완료', in_use:'사용중', pending:'대기'
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[status]||'bg-gray-100 text-gray-600'}`}>{labels[status]||status}</span>;
}

// ════════════════════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reservations');

  // ── 인증 (service role API 경유 → RLS 우회) ────────
  const handleAuth = async () => {
    if (!employeeId || !password) {
      alert('사원번호와 비밀번호를 모두 입력해주세요.');
      return;
    }
    setAuthLoading(true);
    try {
      const res  = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || '로그인 실패'); return; }
      _adminId = json.employee_id;   // 이후 API 호출에 사용
      setAdminName(json.name);
      setIsAuthed(true);
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const TABS = [
    { key: 'reservations', label: '📋 예약 관리' },
    { key: 'dashboard',    label: '📊 대시보드' },
    { key: 'vehicles',     label: '🚗 차량 관리' },
    { key: 'users',        label: '👥 사용자 관리' },
    { key: 'stats',        label: '📈 이력/통계' },
    { key: 'maintenance',  label: '🔧 정비 이력' },
    { key: 'export',       label: '📥 내보내기' },
  ];

  // ── 로그인 게이트: 인증 전에는 로그인 폼 표시 ──────────
  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-xl font-bold text-gray-800">관리자 로그인</h1>
            <p className="text-xs text-gray-400 mt-1">관리자 계정으로 로그인해 주세요</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">사원번호</label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="사원번호 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="비밀번호 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 mt-2"
            >
              {authLoading ? '확인 중...' : '로그인'}
            </button>
          </div>
          <button onClick={() => router.push('/')} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 text-center">
            ← 메인으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🔧 관리자 페이지</h1>
            <p className="text-xs text-gray-400">{adminName}님 로그인</p>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>{_adminId='';setIsAuthed(false);setEmployeeId('');setPassword('');}} className="text-sm text-red-400 hover:text-red-600">로그아웃</button>
            <button onClick={()=>router.push('/')} className="text-sm text-gray-400 hover:text-gray-600">메인으로</button>
          </div>
        </div>
        {/* 탭 */}
        <div className="max-w-5xl mx-auto mt-3 flex gap-1 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab===t.key?'bg-blue-600 text-white':'text-gray-500 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {activeTab === 'reservations' && <TabReservations />}
        {activeTab === 'dashboard'    && <TabDashboard />}
        {activeTab === 'vehicles'     && <TabVehicles />}
        {activeTab === 'users'        && <TabUsers />}
        {activeTab === 'stats'        && <TabStats />}
        {activeTab === 'maintenance'  && <TabMaintenance />}
        {activeTab === 'export'       && <TabExport />}
      </div>
    </main>
  );
}

// ════════════════════════════════════════════════════════
// 탭 1: 예약 관리
// ════════════════════════════════════════════════════════
function TabReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Reservation|null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    const url = filter === 'all' ? '/api/admin/reservations' : `/api/admin/reservations?status=${filter}`;
    const res = await fetch(url, { headers:{'X-Admin-Id': getAdminId()} });
    const json = await res.json();
    if (res.ok && json.reservations) setReservations(json.reservations);
    setLoading(false);
  };
  useEffect(()=>{ fetchReservations(); }, [filter]);

  const handleApprove = async (r: Reservation) => {
    if (!confirm('이 예약을 승인하시겠습니까?')) return;
    setActionLoading(true);
    const res = await fetch('/api/admin/reservations', {
      method:'PATCH',
      headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()},
      body: JSON.stringify({ id: r.id, action:'approve' }),
    });
    const json = await res.json();
    if (!res.ok) { alert('처리 실패: '+json.error); setActionLoading(false); return; }
    if (json.userEmail) await sendEmail('approved', r, json.userEmail);
    setActionLoading(false); fetchReservations();
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    const res = await fetch('/api/admin/reservations', {
      method:'PATCH',
      headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()},
      body: JSON.stringify({ id: rejectTarget.id, action:'reject', reject_reason: rejectReason }),
    });
    const json = await res.json();
    if (!res.ok) { alert('처리 실패: '+json.error); setActionLoading(false); return; }
    if (json.userEmail) await sendEmail('rejected', rejectTarget, json.userEmail, rejectReason||undefined);
    setRejectTarget(null); setRejectReason(''); setActionLoading(false); fetchReservations();
  };

  return (
    <div>
      {rejectTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-1">예약 반려</h3>
            <p className="text-sm text-gray-500 mb-4">{rejectTarget.user_name}님의 예약을 반려합니다.</p>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="반려 사유 (선택)" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"/>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setRejectTarget(null)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">취소</button>
              <button onClick={handleRejectConfirm} disabled={actionLoading} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:bg-gray-400">{actionLoading?'처리 중...':'반려 확정'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {[{key:'all',label:'전체'},{key:'pending',label:'대기'},{key:'approved',label:'승인'},{key:'in_use',label:'사용중'},{key:'returned',label:'반납완료'},{key:'rejected',label:'반려'}].map(t=>(
          <button key={t.key} onClick={()=>setFilter(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter===t.key?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <p className="text-center text-gray-400 py-10">로딩 중...</p>
        : reservations.length === 0 ? <p className="text-center text-gray-400 py-10">예약 내역이 없습니다.</p>
        : (
          <div className="space-y-4">
            {reservations.map(r=>(
              <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{r.user_name}</span>
                    <span className="text-sm text-gray-400">{r.department}</span>
                  </div>
                  <StatusBadge status={r.status}/>
                </div>
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  <p>📅 {new Date(r.time).toLocaleString('ko-KR')} ~ {r.return_time?new Date(r.return_time).toLocaleString('ko-KR'):'미정'}</p>
                  {r.vehicles && <p>🚗 {r.vehicles.name} ({r.vehicles.number}) / {r.vehicles.fuel}</p>}
                  <p>📍 {r.garage}</p>
                  {r.passengers && <p>👥 동승자: {r.passengers}</p>}
                  {r.status==='returned' && r.mileage!=null && <p className="text-blue-600">주행거리: {r.mileage.toLocaleString()} km</p>}
                </div>
                {r.status==='pending' && (
                  <div className="flex gap-2">
                    <button onClick={()=>handleApprove(r)} disabled={actionLoading} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-600 disabled:bg-gray-300">✅ 승인</button>
                    <button onClick={()=>{setRejectTarget(r);setRejectReason('');}} disabled={actionLoading} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:bg-gray-300">❌ 반려</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 탭 2: 대시보드
// ════════════════════════════════════════════════════════
function TabDashboard() {
  const [stats, setStats] = useState({ total:0, pending:0, approved:0, in_use:0, returned:0 });
  const [todayRes, setTodayRes] = useState<Reservation[]>([]);
  const [vehicleStats, setVehicleStats] = useState<{name:string;number:string;count:number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1).toISOString();

      const [allRes, todayRes, vehiclesRes] = await Promise.all([
        fetch('/api/admin/reservations', { headers:{'X-Admin-Id':getAdminId()} }).then(r=>r.json()),
        fetch(`/api/admin/reservations?status=all`, { headers:{'X-Admin-Id':getAdminId()} }).then(r=>r.json()),
        fetch('/api/admin/vehicles').then(r=>r.json()),
      ]);
      const all      = allRes.reservations ?? [];
      const todayData = (todayRes.reservations ?? []).filter((r:any)=> r.time >= start && r.time < end);
      const vehicles  = vehiclesRes.vehicles ?? [];

      if (all) {
        setStats({
          total: all.length,
          pending:  all.filter(r=>r.status==='pending').length,
          approved: all.filter(r=>r.status==='approved').length,
          in_use:   all.filter(r=>r.status==='in_use').length,
          returned: all.filter(r=>r.status==='returned').length,
        });
      }
      if (todayData) setTodayRes(todayData as Reservation[]);

      if (vehicles && all) {
        const counts = vehicles.map(v=>({
          name: v.name, number: v.number,
          count: (all as any[]).filter((r:any)=>r.vehicle_id===v.id && ['approved','in_use','returned'].includes(r.status)).length,
        }));
        setVehicleStats(counts);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-center text-gray-400 py-10">로딩 중...</p>;

  const statCards = [
    { label: '전체 예약', value: stats.total, color: 'text-gray-800', bg: 'bg-gray-50' },
    { label: '승인 대기', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: '승인 완료', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '사용 중', value: stats.in_use, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '반납 완료', value: stats.returned, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(c=>(
          <div key={c.label} className={`${c.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* 오늘 예약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">📅 오늘 예약 현황 ({todayRes.length}건)</h3>
        {todayRes.length === 0 ? <p className="text-sm text-gray-400">오늘 예약이 없습니다.</p> : (
          <div className="space-y-2">
            {todayRes.map(r=>(
              <div key={r.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                <div>
                  <span className="font-semibold text-gray-800">{r.user_name}</span>
                  <span className="text-gray-400 ml-2">{r.vehicles?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{new Date(r.time).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>
                  <StatusBadge status={r.status}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 차량별 이용 현황 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">🚗 차량별 누적 이용 횟수</h3>
        <div className="space-y-3">
          {vehicleStats.map((v, i)=>{
            const max = Math.max(...vehicleStats.map(x=>x.count), 1);
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{v.name} <span className="text-gray-400 text-xs">({v.number})</span></span>
                  <span className="font-semibold text-blue-600">{v.count}회</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width:`${(v.count/max)*100}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 탭 3: 차량 관리
// ════════════════════════════════════════════════════════
function TabVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle|null>(null);
  const [form, setForm] = useState({ name:'', number:'', fuel:'경유', garage:'휴네시온 타워', current_km:'0' });
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/vehicles');
    const json = await res.json();
    if (res.ok && json.vehicles) setVehicles(json.vehicles);
    setLoading(false);
  };
  useEffect(()=>{ fetchVehicles(); }, []);

  const openAdd = () => { setEditTarget(null); setForm({name:'',number:'',fuel:'경유',garage:'휴네시온 타워',current_km:'0'}); setShowForm(true); };
  const openEdit = (v: Vehicle) => { setEditTarget(v); setForm({name:v.name,number:v.number,fuel:v.fuel,garage:v.garage,current_km:String(v.current_km)}); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name||!form.number) { alert('차량명과 차량번호를 입력해주세요.'); return; }
    setSaving(true);
    const payload = { name:form.name, number:form.number, fuel:form.fuel, garage:form.garage, current_km:parseInt(form.current_km)||0 };
    if (editTarget) {
      await fetch('/api/admin/vehicles', { method:'PATCH', headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()}, body:JSON.stringify({id:editTarget.id,...payload}) });
    } else {
      await fetch('/api/admin/vehicles', { method:'POST', headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()}, body:JSON.stringify(payload) });
    }
    setSaving(false); setShowForm(false); fetchVehicles();
  };

  const handleDelete = async (v: Vehicle) => {
    if (!confirm(`${v.name} (${v.number})을 삭제하시겠습니까?\n관련 예약 데이터가 있을 경우 문제가 발생할 수 있습니다.`)) return;
    await fetch('/api/admin/vehicles', { method:'DELETE', headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()}, body:JSON.stringify({id:v.id}) });
    fetchVehicles();
  };

  return (
    <div>
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editTarget?'차량 수정':'차량 추가'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">차량명 *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="예: 스포티지 2.0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">차량번호 *</label>
                <input value={form.number} onChange={e=>setForm({...form,number:e.target.value})} placeholder="예: 139서1952" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">연료</label>
                <select value={form.fuel} onChange={e=>setForm({...form,fuel:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option>경유</option><option>휘발유</option><option>LPG</option><option>전기</option><option>하이브리드</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">차고지</label>
                <input value={form.garage} onChange={e=>setForm({...form,garage:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">현재 km</label>
                <input type="number" value={form.current_km} onChange={e=>setForm({...form,current_km:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-semibold">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400">{saving?'저장 중...':'저장'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <h3 className="font-bold text-gray-800">차량 목록 ({vehicles.length}대)</h3>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">+ 차량 추가</button>
      </div>

      {loading ? <p className="text-center text-gray-400 py-10">로딩 중...</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {vehicles.map(v=>(
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-gray-800">{v.name}</p>
                  <p className="text-sm text-gray-500">{v.number}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>openEdit(v)} className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2 py-1">수정</button>
                  <button onClick={()=>handleDelete(v)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">삭제</button>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>⛽ {v.fuel}</span>
                <span>📍 {v.garage}</span>
                <span>🔢 {v.current_km.toLocaleString()} km</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 탭 4: 사용자 관리
// ════════════════════════════════════════════════════════
type UserSubTab = 'list' | 'create' | 'bulk';

interface CreateForm { name:string; employee_id:string; email:string; department:string; temp_password:string; role:string; }
interface BulkRow    { name:string; employee_id:string; email:string; department:string; temp_password:string; }
interface BulkResult { row:number; name:string; employee_id:string; email:string; status:'success'|'failed'; reason?:string; }
interface PwModal    { user: User; mode: 'reset'|'change'; newPw: string; }

// 로그인된 관리자 사원번호를 모듈 수준 변수에 저장 (API 헤더에 사용)
let _adminId = '';
function getAdminId(): string { return _adminId; }

function TabUsers() {
  const [subTab,        setSubTab]        = useState<UserSubTab>('list');
  const [users,         setUsers]         = useState<User[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search,        setSearch]        = useState('');

  // 계정 생성
  const [createForm,    setCreateForm]    = useState<CreateForm>({ name:'', employee_id:'', email:'', department:'', temp_password:'', role:'user' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg,     setCreateMsg]     = useState<{type:'ok'|'err'; text:string}|null>(null);

  // 일괄 업로드
  const [bulkRows,      setBulkRows]      = useState<BulkRow[]>([]);
  const [bulkResults,   setBulkResults]   = useState<BulkResult[]|null>(null);
  const [bulkLoading,   setBulkLoading]   = useState(false);
  const [bulkMsg,       setBulkMsg]       = useState('');

  // 비밀번호 모달
  const [pwModal,       setPwModal]       = useState<PwModal|null>(null);
  const [pwLoading,     setPwLoading]     = useState(false);
  const [pwMsg,         setPwMsg]         = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users', { headers:{'X-Admin-Id': getAdminId()} });
    const json = await res.json();
    if (res.ok && json.users) setUsers(json.users as User[]);
    setLoading(false);
  };
  useEffect(()=>{ fetchUsers(); }, []);

  // ─── 권한 토글 ──────────────────────────────────────────
  const toggleAdmin = async (u: User) => {
    const newRole = u.role==='admin' ? 'user' : 'admin';
    if (!confirm(newRole==='admin' ? `${u.name}님에게 관리자 권한을 부여하시겠습니까?` : `${u.name}님의 관리자 권한을 해제하시겠습니까?`)) return;
    setActionLoading(true);
    await fetch('/api/admin/users', { method:'PATCH', headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()}, body:JSON.stringify({id:u.id, field:'role', value:newRole}) });
    setActionLoading(false); fetchUsers();
  };

  // ─── 활성/비활성 토글 ─────────────────────────────────
  const toggleActive = async (u: User) => {
    const next = !u.is_active;
    if (!confirm(`${u.name}님의 계정을 ${next?'활성화':'비활성화'}하시겠습니까?`)) return;
    setActionLoading(true);
    await fetch('/api/admin/users', { method:'PATCH', headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()}, body:JSON.stringify({id:u.id, field:'is_active', value:next}) });
    setActionLoading(false); fetchUsers();
  };

  // ─── 단건 계정 생성 ───────────────────────────────────
  const handleCreate = async () => {
    setCreateMsg(null);
    const { name, employee_id, email, department, temp_password, role } = createForm;
    if (!name||!employee_id||!email||!temp_password) {
      setCreateMsg({ type:'err', text:'이름, 사번, 이메일, 임시비밀번호는 필수입니다.' }); return;
    }
    setCreateLoading(true);
    const res = await fetch('/api/admin/create-user', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-Admin-Id': getAdminId() },
      body: JSON.stringify({ name, employee_id, email, department, temp_password, role }),
    });
    const json = await res.json();
    if (!res.ok) { setCreateMsg({ type:'err', text: json.error }); }
    else {
      setCreateMsg({ type:'ok', text: json.message });
      setCreateForm({ name:'', employee_id:'', email:'', department:'', temp_password:'', role:'user' });
      fetchUsers();
    }
    setCreateLoading(false);
  };

  // ─── 엑셀 파일 파싱 (SheetJS CDN) ────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkRows([]); setBulkResults(null); setBulkMsg('');

    // SheetJS 동적 로드
    const XLSX: any = await new Promise((resolve, reject) => {
      if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload  = () => resolve((window as any).XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const rows: BulkRow[] = raw.map((r:any) => ({
      name:          String(r['name']          || r['이름']          || '').trim(),
      employee_id:   String(r['employee_id']   || r['사번']          || '').trim(),
      email:         String(r['email']         || r['이메일']        || '').trim(),
      department:    String(r['department']    || r['부서']          || '').trim(),
      temp_password: String(r['temp_password'] || r['임시비밀번호']  || '').trim(),
    }));
    setBulkRows(rows);
    if (rows.length > 200) setBulkMsg('⚠️ 최대 200건까지 업로드 가능합니다. 처음 200건만 미리보기됩니다.');
  };

  // ─── 일괄 업로드 실행 ────────────────────────────────
  const handleBulkUpload = async () => {
    if (bulkRows.length === 0) return;
    if (!confirm(`${bulkRows.length}건을 업로드하시겠습니까?`)) return;
    setBulkLoading(true); setBulkResults(null);
    const res = await fetch('/api/admin/bulk-upload', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-Admin-Id': getAdminId() },
      body: JSON.stringify({ rows: bulkRows.slice(0,200) }),
    });
    const json = await res.json();
    setBulkResults(json.results || []);
    setBulkMsg(`완료: 성공 ${json.successCount}건 / 실패 ${json.failedCount}건`);
    if (json.successCount > 0) fetchUsers();
    setBulkLoading(false);
  };

  // ─── 엑셀 템플릿 다운로드 ────────────────────────────
  const downloadTemplate = async () => {
    const XLSX: any = await new Promise((resolve, reject) => {
      if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload  = () => resolve((window as any).XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
    });
    const ws = XLSX.utils.aoa_to_sheet([
      ['name','employee_id','email','department','temp_password'],
      ['홍길동','EMP001','hong@hunesion.com','경영지원본부','Hune2026!'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '직원목록');
    XLSX.writeFile(wb, '직원_일괄등록_템플릿.xlsx');
  };

  // ─── 비밀번호 모달 처리 ──────────────────────────────
  const handlePasswordAction = async () => {
    if (!pwModal) return;
    if (pwModal.mode==='change' && pwModal.newPw.length < 6) {
      setPwMsg('비밀번호는 6자 이상이어야 합니다.'); return;
    }
    setPwLoading(true); setPwMsg('');
    const body = pwModal.mode==='reset'
      ? { action:'reset', target_auth_id: pwModal.user.auth_id }
      : { action:'change', target_auth_id: pwModal.user.auth_id, new_password: pwModal.newPw };

    const res  = await fetch('/api/admin/update-password', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-Admin-Id': getAdminId() },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) { setPwMsg(`오류: ${json.error}`); }
    else {
      const detail = pwModal.mode==='reset' ? ` (임시 비밀번호: ${json.temp_password})` : '';
      alert(json.message + detail);
      setPwModal(null);
    }
    setPwLoading(false);
  };

  const filtered = users.filter(u =>
    u.name.includes(search) || (u.department||'').includes(search) || u.employee_id.includes(search)
  );

  return (
    <div>
      {/* 비밀번호 모달 */}
      {pwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {pwModal.mode==='reset' ? '🔑 비밀번호 초기화' : '🔒 비밀번호 변경'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{pwModal.user.name} ({pwModal.user.employee_id})</p>
            {pwModal.mode==='reset' ? (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
                임시 비밀번호 <strong>Hune2026!</strong> 로 초기화됩니다.<br/>
                다음 로그인 시 비밀번호 변경이 강제됩니다.
              </p>
            ) : (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">새 비밀번호 (6자 이상)</label>
                <input type="password" value={pwModal.newPw} onChange={e=>setPwModal({...pwModal,newPw:e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            )}
            {pwMsg && <p className="text-sm text-red-500 mt-2">{pwMsg}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{setPwModal(null);setPwMsg('');}} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-semibold">취소</button>
              <button onClick={handlePasswordAction} disabled={pwLoading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400">
                {pwLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 서브 탭 */}
      <div className="flex gap-2 mb-6">
        {([['list','👥 직원 목록'],['create','➕ 계정 생성'],['bulk','📤 일괄 업로드']] as [UserSubTab,string][]).map(([k,l])=>(
          <button key={k} onClick={()=>setSubTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${subTab===k?'bg-indigo-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── 서브탭: 직원 목록 ── */}
      {subTab==='list' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">전체 {users.length}명 / 활성 {users.filter(u=>u.is_active).length}명</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름/부서/사번 검색"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"/>
          </div>
          {loading ? <p className="text-center text-gray-400 py-10">로딩 중...</p> : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['이름','부서','사번','이메일','권한','상태','가입일','관리'].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u=>(
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!u.is_active?'opacity-50':''}`}>
                      <td className="px-3 py-3 font-medium text-gray-800">
                        {u.name}
                        {u.must_change_password && <span className="ml-1 text-xs text-orange-500">(첫로그인)</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{u.department||'-'}</td>
                      <td className="px-3 py-3 text-gray-600">{u.employee_id}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role==='admin'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>
                          {u.role==='admin'?'관리자':'일반'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-500'}`}>
                          {u.is_active?'활성':'비활성'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">{u.created_at.slice(0,10)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={()=>toggleAdmin(u)} disabled={actionLoading}
                            className={`text-xs px-2 py-1 rounded border ${u.role==='admin'?'border-orange-200 text-orange-500':'border-blue-200 text-blue-500'}`}>
                            {u.role==='admin'?'권한해제':'관리자'}
                          </button>
                          <button onClick={()=>toggleActive(u)} disabled={actionLoading}
                            className={`text-xs px-2 py-1 rounded border ${u.is_active?'border-gray-200 text-gray-500':'border-green-200 text-green-500'}`}>
                            {u.is_active?'비활성화':'활성화'}
                          </button>
                          {u.auth_id && <>
                            <button onClick={()=>setPwModal({user:u,mode:'reset',newPw:''})}
                              className="text-xs px-2 py-1 rounded border border-yellow-200 text-yellow-600">초기화</button>
                            <button onClick={()=>setPwModal({user:u,mode:'change',newPw:''})}
                              className="text-xs px-2 py-1 rounded border border-purple-200 text-purple-500">비번변경</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length===0 && <p className="text-center text-gray-400 py-8 text-sm">검색 결과가 없습니다.</p>}
            </div>
          )}
        </div>
      )}

      {/* ── 서브탭: 계정 생성 ── */}
      {subTab==='create' && (
        <div className="max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">직원 계정 생성</h3>
            {createMsg && (
              <div className={`rounded-lg px-4 py-3 text-sm mb-4 ${createMsg.type==='ok'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
                {createMsg.type==='ok'?'✅':'⚠️'} {createMsg.text}
              </div>
            )}
            <div className="space-y-3">
              {([
                ['이름 *',       'name',          'text',     '홍길동'],
                ['사번 *',       'employee_id',   'text',     'EMP001'],
                ['이메일 *',     'email',         'email',    'hong@hunesion.com'],
                ['부서',         'department',    'text',     '경영지원본부'],
                ['임시비밀번호 *','temp_password', 'password', '6자 이상'],
              ] as [string,keyof CreateForm,string,string][]).map(([label,key,type,ph])=>(
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
                  <input type={type} value={createForm[key]} placeholder={ph}
                    onChange={e=>{ setCreateForm({...createForm,[key]:e.target.value}); setCreateMsg(null); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">권한</label>
                <select value={createForm.role} onChange={e=>setCreateForm({...createForm,role:e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="user">일반</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreate} disabled={createLoading}
              className="w-full mt-5 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400">
              {createLoading ? '생성 중...' : '계정 생성'}
            </button>
          </div>
        </div>
      )}

      {/* ── 서브탭: 일괄 업로드 ── */}
      {subTab==='bulk' && (
        <div>
          <div className="flex gap-3 mb-5">
            <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-700">
              📂 엑셀 파일 선택
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange}/>
            </label>
            <button onClick={downloadTemplate}
              className="border border-indigo-300 text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50">
              📥 템플릿 다운로드
            </button>
          </div>

          <div className="text-xs text-gray-400 mb-4 bg-gray-50 rounded-lg p-3">
            엑셀 컬럼: <strong>name</strong> (이름) · <strong>employee_id</strong> (사번) · <strong>email</strong> (이메일) · <strong>department</strong> (부서) · <strong>temp_password</strong> (임시비밀번호) | 최대 200건
          </div>

          {bulkRows.length > 0 && !bulkResults && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-gray-700">미리보기 ({bulkRows.length}건)</p>
                <button onClick={handleBulkUpload} disabled={bulkLoading}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400">
                  {bulkLoading ? '업로드 중...' : '▶ 업로드 실행'}
                </button>
              </div>
              {bulkMsg && <p className="text-xs text-yellow-600 mb-2">{bulkMsg}</p>}
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{['#','이름','사번','이메일','부서','임시비밀번호'].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {bulkRows.slice(0,200).map((r,i)=>(
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-1.5 text-gray-400">{i+2}</td>
                        <td className="px-3 py-1.5">{r.name||<span className="text-red-400">누락</span>}</td>
                        <td className="px-3 py-1.5">{r.employee_id||<span className="text-red-400">누락</span>}</td>
                        <td className="px-3 py-1.5">{r.email||<span className="text-red-400">누락</span>}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.department||'-'}</td>
                        <td className="px-3 py-1.5 text-gray-400">{'*'.repeat(Math.min(r.temp_password.length,8))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bulkResults && (
            <div>
              <div className={`rounded-xl px-5 py-3 mb-4 flex gap-6 text-sm font-semibold ${bulkResults.some(r=>r.status==='failed')?'bg-yellow-50':'bg-green-50'}`}>
                <span className="text-green-700">✅ 성공 {bulkResults.filter(r=>r.status==='success').length}건</span>
                <span className="text-red-600">❌ 실패 {bulkResults.filter(r=>r.status==='failed').length}건</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{['행','이름','사번','이메일','결과','사유'].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r,i)=>(
                      <tr key={i} className={`border-t border-gray-50 ${r.status==='failed'?'bg-red-50':''}`}>
                        <td className="px-3 py-1.5 text-gray-400">{r.row}</td>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.employee_id}</td>
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">
                          {r.status==='success'
                            ? <span className="text-green-600 font-semibold">✅ 성공</span>
                            : <span className="text-red-500 font-semibold">❌ 실패</span>}
                        </td>
                        <td className="px-3 py-1.5 text-red-500">{r.reason||''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={()=>{ setBulkRows([]); setBulkResults(null); setBulkMsg(''); }}
                className="mt-3 text-sm text-gray-400 hover:text-gray-600">← 다시 업로드</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 탭 5: 예약 이력/통계
// ════════════════════════════════════════════════════════
function TabStats() {
  const [monthly, setMonthly] = useState<{month:string;count:number}[]>([]);
  const [dept, setDept] = useState<{department:string;count:number}[]>([]);
  const [vehicle, setVehicle] = useState<{name:string;mileage:number;count:number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      const res = await fetch('/api/admin/reservations?status=returned', { headers:{'X-Admin-Id':getAdminId()} });
      const json = await res.json();
      const data = json.reservations ?? [];
      if (!data.length) { setLoading(false); return; }

      // 월별
      const mMap: Record<string,number> = {};
      data.forEach((r:any) => {
        const m = r.time.slice(0,7);
        mMap[m] = (mMap[m]||0) + 1;
      });
      setMonthly(Object.entries(mMap).sort().slice(-6).map(([month,count])=>({month,count})));

      // 부서별
      const dMap: Record<string,number> = {};
      data.forEach((r:any) => { dMap[r.department] = (dMap[r.department]||0) + 1; });
      setDept(Object.entries(dMap).sort((a,b)=>b[1]-a[1]).map(([department,count])=>({department,count})));

      // 차량별 누적 주행
      const vMap: Record<string,{name:string;mileage:number;count:number}> = {};
      data.forEach((r:any) => {
        const key = r.vehicles?.name || String(r.vehicle_id);
        if (!vMap[key]) vMap[key] = { name: key, mileage:0, count:0 };
        vMap[key].mileage += r.mileage||0;
        vMap[key].count += 1;
      });
      setVehicle(Object.values(vMap).sort((a,b)=>b.mileage-a.mileage));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-center text-gray-400 py-10">로딩 중...</p>;

  const maxMonth = Math.max(...monthly.map(m=>m.count), 1);
  const maxDept  = Math.max(...dept.map(d=>d.count), 1);

  return (
    <div className="space-y-6">
      {/* 월별 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">📅 월별 예약 현황 (최근 6개월)</h3>
        {monthly.length === 0 ? <p className="text-sm text-gray-400">데이터가 없습니다.</p> : (
          <div className="space-y-2">
            {monthly.map(m=>(
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">{m.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                  <div className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all" style={{width:`${(m.count/maxMonth)*100}%`,minWidth:'24px'}}>
                    <span className="text-white text-xs font-bold">{m.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 부서별 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">🏢 부서별 이용 현황</h3>
        {dept.length === 0 ? <p className="text-sm text-gray-400">데이터가 없습니다.</p> : (
          <div className="space-y-2">
            {dept.map(d=>(
              <div key={d.department} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">{d.department}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                  <div className="bg-indigo-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all" style={{width:`${(d.count/maxDept)*100}%`,minWidth:'24px'}}>
                    <span className="text-white text-xs font-bold">{d.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 차량별 주행거리 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">🚗 차량별 누적 주행거리</h3>
        {vehicle.length === 0 ? <p className="text-sm text-gray-400">데이터가 없습니다.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">차량</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">이용 횟수</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">누적 주행</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">평균 주행</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.map(v=>(
                  <tr key={v.name} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-800 font-medium">{v.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{v.count}회</td>
                    <td className="py-2.5 text-right font-semibold text-blue-600">{v.mileage.toLocaleString()} km</td>
                    <td className="py-2.5 text-right text-gray-500">{v.count>0?Math.round(v.mileage/v.count).toLocaleString():0} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 탭 6: 차량 정비 이력
// ════════════════════════════════════════════════════════
function TabMaintenance() {
  const [records, setRecords] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id:'', date:'', description:'', cost:'0' });
  const [saving, setSaving] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    const [mRes, vRes] = await Promise.all([
      fetch('/api/admin/maintenance', { headers:{'X-Admin-Id':getAdminId()} }).then(r=>r.json()),
      fetch('/api/admin/vehicles').then(r=>r.json()),
    ]);
    if (mRes.maintenance) setRecords(mRes.maintenance as Maintenance[]);
    if (vRes.vehicles) setVehicles(vRes.vehicles);
    setLoading(false);
  };
  useEffect(()=>{ fetchData(); }, []);

  const handleSave = async () => {
    if (!form.vehicle_id||!form.date||!form.description) { alert('차량, 날짜, 내용을 입력해주세요.'); return; }
    setSaving(true);
    await fetch('/api/admin/maintenance', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()},
      body: JSON.stringify({ vehicle_id:parseInt(form.vehicle_id), date:form.date, description:form.description, cost:parseInt(form.cost)||0 }),
    });
    setSaving(false); setShowForm(false); setForm({vehicle_id:'',date:'',description:'',cost:'0'}); fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 정비 이력을 삭제하시겠습니까?')) return;
    await fetch('/api/admin/maintenance', { method:'DELETE', headers:{'Content-Type':'application/json','X-Admin-Id':getAdminId()}, body:JSON.stringify({id}) });
    fetchData();
  };

  const filtered = filterVehicle === 'all' ? records : records.filter(r=>String(r.vehicle_id)===filterVehicle);
  const totalCost = filtered.reduce((s,r)=>s+r.cost,0);

  return (
    <div>
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">정비 이력 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">차량 *</label>
                <select value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">선택하세요</option>
                  {vehicles.map(v=><option key={v.id} value={v.id}>{v.name} ({v.number})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">정비일 *</label>
                <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">정비 내용 *</label>
                <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="예: 엔진오일 교체, 타이어 교체 등" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">비용 (원)</label>
                <input type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-semibold">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400">{saving?'저장 중...':'저장'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-800">정비 이력</h3>
          <select value={filterVehicle} onChange={e=>setFilterVehicle(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">전체 차량</option>
            {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <button onClick={()=>setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">+ 정비 등록</button>
      </div>

      {filtered.length > 0 && (
        <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex justify-between text-sm">
          <span className="text-gray-600">{filterVehicle==='all'?'전체':vehicles.find(v=>String(v.id)===filterVehicle)?.name} 정비 {filtered.length}건</span>
          <span className="font-bold text-blue-700">총 {totalCost.toLocaleString()}원</span>
        </div>
      )}

      {loading ? <p className="text-center text-gray-400 py-10">로딩 중...</p> : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10">정비 이력이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(r=>(
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{r.vehicles?.name}</span>
                    <span className="text-xs text-gray-400">{r.date}</span>
                  </div>
                  <p className="text-sm text-gray-800">{r.description}</p>
                  {r.cost > 0 && <p className="text-sm font-semibold text-blue-600 mt-1">{r.cost.toLocaleString()}원</p>}
                </div>
                <button onClick={()=>handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-1 ml-2">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 탭 7: CSV/엑셀 내보내기
// ════════════════════════════════════════════════════════
function TabExport() {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const downloadCSV = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/admin/reservations?${params}`, { headers:{'X-Admin-Id':getAdminId()} });
    const json = await res.json();
    let data = json.reservations ?? [];
    if (dateFrom) data = data.filter((r:any) => r.time >= dateFrom+'T00:00:00');
    if (dateTo)   data = data.filter((r:any) => r.time <= dateTo+'T23:59:59');
    if (!data.length) { alert('내보낼 데이터가 없습니다.'); setLoading(false); return; }

    const statusLabel: Record<string,string> = { pending:'대기', approved:'승인', in_use:'사용중', returned:'반납완료', rejected:'반려' };
    const headers = ['예약번호','예약자','부서','차량명','차량번호','출발시간','반납예정','차고지','동승자','상태','출발km','도착km','주행거리','반납완료시각','반납유형','특이사항','신청일'];
    const rows = data.map((r:any) => [
      r.id, r.user_name, r.department,
      r.vehicles?.name||'', r.vehicles?.number||'',
      r.time ? new Date(r.time).toLocaleString('ko-KR') : '',
      r.return_time ? new Date(r.return_time).toLocaleString('ko-KR') : '',
      r.garage, r.passengers||'',
      statusLabel[r.status]||r.status,
      r.start_km??'', r.end_km??'', r.mileage??'',
      r.returned_at ? new Date(r.returned_at).toLocaleString('ko-KR') : '',
      r.usage_type==='unused'?'미사용반납':'정상사용',
      r.note||'',
      new Date(r.created_at).toLocaleString('ko-KR'),
    ]);

    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `예약이력_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  const downloadMaintenance = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/maintenance', { headers:{'X-Admin-Id':getAdminId()} });
    const json = await res.json();
    const data = json.maintenance ?? [];
    if (!data.length) { alert('내보낼 정비 이력이 없습니다.'); setLoading(false); return; }

    const headers = ['정비번호','차량명','차량번호','정비일','정비내용','비용(원)','등록일'];
    const rows = data.map((r:any) => [r.id, r.vehicles?.name||'', r.vehicles?.number||'', r.date, r.description, r.cost||0, new Date(r.created_at).toLocaleString('ko-KR')]);

    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(row => row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `정비이력_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* 예약 이력 내보내기 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-1">📋 예약 이력 CSV 내보내기</h3>
        <p className="text-xs text-gray-400 mb-5">조건을 설정하고 CSV 파일로 다운로드합니다.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">상태 필터</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="all">전체</option>
              <option value="pending">대기</option>
              <option value="approved">승인</option>
              <option value="in_use">사용중</option>
              <option value="returned">반납완료</option>
              <option value="rejected">반려</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 block mb-1">시작일</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 block mb-1">종료일</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>
        </div>

        <button onClick={downloadCSV} disabled={loading} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
          {loading ? '처리 중...' : '📥 예약 이력 다운로드 (.csv)'}
        </button>
      </div>

      {/* 정비 이력 내보내기 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-1">🔧 정비 이력 CSV 내보내기</h3>
        <p className="text-xs text-gray-400 mb-5">전체 정비 이력을 CSV 파일로 다운로드합니다.</p>
        <button onClick={downloadMaintenance} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:bg-gray-400">
          {loading ? '처리 중...' : '📥 정비 이력 다운로드 (.csv)'}
        </button>
      </div>
    </div>
  );
}
