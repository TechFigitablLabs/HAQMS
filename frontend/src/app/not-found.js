'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Activity } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen justify-center items-center py-12 px-6 lg:px-8 text-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-3xl font-black text-cyan-800 dark:text-cyan-300">
          <Activity className="h-8 w-8" />
          HAQMS
        </Link>
        
        <div className="surface-card mx-auto max-w-sm p-8">
          <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full w-fit mx-auto mb-6">
            <ShieldAlert className="h-10 w-10" />
          </div>
          
          <h2 className="text-4xl font-black text-slate-950 dark:text-slate-100">404</h2>
          <h3 className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            Page Not Found / Incomplete
          </h3>
          
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            <strong>Candidate Mission Note:</strong> This route is deliberately left incomplete! 
            Clicking a &ldquo;View Medical Records&rdquo; link triggers this 404. 
            Your task might include building the missing page component to fetch and render patient records.
          </p>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="cta-primary w-full justify-center rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
