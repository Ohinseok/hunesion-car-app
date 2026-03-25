'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // 사번 또는 이메일
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('사번(또는 이메일)과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. 사번 입력 시 이메일 조회 (DB 함수 사용)
      let email = identifier.trim();
      if (!email.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'get_email_by_employee_id',
          { p_employee_id: identifier.trim() }
        );
        if (rpcErr || !resolvedEmail) {
          setError('등록되지 않은 사번이거나 비활성화된 계정입니다.');
          setLoading(false);
          return;
        }
        email = resolvedEmail as string;
      }

      // 2. Supabase Auth 로그인
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      });

      if (signInErr || !data.session) {
        setError('비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      // 3. 사용자 프로필 조회 (is_active, must_change_password, role)
      const { data: profile } = await supabase
        .from('users')
        .select('name, role, is_active, must_change_password')
        .eq('auth_id', data.user.id)
        .single();

      if (!profile) {
        setError('사용자 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 4. 비활성화 계정 차단
      if (!profile.is_active) {
        setError('비활성화된 계정입니다. 관리자에게 문의하세요.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 5. 비밀번호 강제 변경 대상
      if (profile.must_change_password) {
        router.push('/change-password');
        return;
      }

      // 6. 정상 로그인 → 역할별 리다이렉트
      if (profile.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }

    } catch (e) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">🚗 차량 예약 시스템</h1>
          <p className="text-sm text-gray-400 mt-1">HUNESION 임직원 전용</p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* 폼 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사번 또는 이메일</label>
            <input
              type="text"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="사번 또는 이메일 주소"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold text-base active:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          계정이 없으신가요? 관리자에게 문의하세요.
        </p>
      </div>
    </main>
  );
}
