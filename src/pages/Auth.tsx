import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome</h1>
          <p className="mt-2 text-sm text-slate-500">
            Continue with Google to access your account
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C17 3.4 14.8 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.9 0 9.1-4.8 9.1-7.2 0-.5-.1-.9-.1-1.3H12z"
            />
          </svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
