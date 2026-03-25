'use client';
import Link from 'next/link';

export default function RegisterDisabledPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">자가 회원가입 불가</h2>
        <p className="text-sm text-gray-500 mb-6">
          계정은 관리자가 직접 생성합니다.<br/>
          계정이 필요하신 경우 경영지원본부 인사총무팀으로 문의해주세요.
        </p>
        <Link href="/" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-center active:bg-blue-700 transition">
          메인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
