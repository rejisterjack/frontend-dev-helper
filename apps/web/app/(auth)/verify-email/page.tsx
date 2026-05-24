'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, CheckCircle, XCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Check your email for the correct link.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
        }
      } catch {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
          {status === 'loading' && <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />}
          {status === 'success' && <CheckCircle className="w-7 h-7 text-green-400" />}
          {status === 'error' && <XCircle className="w-7 h-7 text-red-400" />}
        </div>
        <h1 className="text-3xl font-black text-white mb-4">
          {status === 'loading' && 'Verifying your email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h1>
        <p className="text-neutral-400 mb-8">{message}</p>
        {status === 'success' && (
          <a href="/dashboard" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-sm inline-block">Go to Dashboard</a>
        )}
        {status === 'error' && (
          <a href="/login" className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold text-sm inline-block hover:bg-white/5">Back to Login</a>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
