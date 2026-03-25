'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [userName, setUserName]           = useState('');

  // 세션 없으면 로그인 페이지로
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: profile } = await supabase
        .from('users')
        .select('name, must_change_password')
        .eq('auth_id', session.user.id)
        .single();

      if (!profile) { router.replace('/login'); return; }

      // must_change_password가 false라면 이미 변경 완료 → 홈으로
      if (!profile.must_change_password) { router.replace('/'); return; }

      setUserName(profile.name);
    };
    check();
  }, [router]);

  const handleChange = async () => {
    if (!newPassword || !confirmPassword) {
      setError('새 비밀번호를 모두 입력해주세요.'); return;
    }
    if (newPassword.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.'); return;
    }

    setLoading(true);
    setError('');

    // 1. Supabase Auth 비밀번호 업데이트
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) {
      setError(`비밀번호 변경 실패: ${updateErr.message}`);
      setLoading(false);
      return;
    }

    // 2. must_change_password = false 업데이트
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('users')
        .update({ must_change_password: false })
        .eq('auth_id', session.user.id);
    }

    // 3. 완료 → 홈으로
    router.replace('/');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-gray-800">비밀번호 변경 필요</h2>
          {userName && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-semibold text-blue-600">{userName}</span>님, 최초 로그인 시 비밀번호를 변경해야 합니다.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); }}
              placeholder="6자 이상"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleChange()}
              placeholder="비밀번호 재입력"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* 비밀번호 강도 표시 */}
        {newPassword && (
          <div className="mt-3">
            <div className="flex gap-1">
              {[1,2,3,4].map(i => {
                const strength = newPassword.length >= 6 ? (newPassword.length >= 10 ? (
                  /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) ? 4 : 3
                ) : 2) : 1;
                return (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength ? (strength <= 1 ? 'bg-red-400' : strength <= 2 ? 'bg-yellow-400' : strength <= 3 ? 'bg-blue-400' : 'bg-green-400') : 'bg-gray-200'}`}/>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {newPassword.length < 6 ? '너무 짧음' : newPassword.length < 10 ? '보통' : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? '강함' : '좋음'}
            </p>
          </div>
        )}

        <button
          onClick={handleChange}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? '변경 중...' : '비밀번호 변경 완료'}
        </button>
      </div>
    </main>
  );
}
