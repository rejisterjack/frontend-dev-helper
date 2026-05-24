'use client';

import { useSession } from 'next-auth/react';

export default function DashboardContent() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black text-white mb-2">Dashboard</h1>
      <p className="text-neutral-500 mb-8">Welcome to your dashboard</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">Account</h2>
          {session?.user ? (
            <div className="space-y-2">
              <p className="text-white font-medium">{session.user.name || 'User'}</p>
              <p className="text-neutral-400 text-sm">{session.user.email}</p>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">Not signed in</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">Extension</h2>
          <p className="text-xl font-bold text-white">100% Free</p>
          <p className="text-neutral-500 text-sm mt-1">All 39 tools available</p>
        </div>
      </div>
    </div>
  );
}
