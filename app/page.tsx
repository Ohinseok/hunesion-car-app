'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-2">🚗 차량 예약 시스템</h1>
        <p className="text-gray-500 text-sm mb-8">HUNESION 임직원 전용</p>

        <Link href="/reservation" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base text-center active:bg-blue-700 transition mb-3">
          예약하기
        </Link>

        <Link href="/return" className="block w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-base text-center active:bg-green-700 transition mb-3">
          🔄 차량 출차 / 반납
        </Link>

        <Link href="/my-reservations" className="block w-full bg-indigo-500 text-white py-3 rounded-xl font-semibold text-base text-center active:bg-indigo-600 transition mb-3">
          📋 내 예약 확인
        </Link>

        <Link href="/register" className="block w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-semibold text-base text-center active:bg-blue-50 transition mb-3">
          회원가입
        </Link>

        <Link href="/admin" className="block w-full border border-gray-300 text-gray-500 py-3 rounded-xl font-semibold text-base text-center active:bg-gray-50 transition">
          🔧 관리자
        </Link>
      </div>
    </main>
  );
}
