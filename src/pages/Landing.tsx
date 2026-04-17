import { Link } from 'react-router-dom';
import { ArrowRight, FileText, BarChart3, ShieldCheck } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          <span className="text-xl font-bold text-slate-900">FormFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign In
          </Link>
          <Link
            to="/auth?mode=signup"
            className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl">
          Build powerful forms in minutes, not hours.
        </h1>
        <p className="mt-6 text-xl text-slate-600 max-w-2xl">
          Create beautiful, responsive forms, collect responses securely, and analyze data instantly. The modern alternative to Google Forms.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            to="/auth?mode=signup"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Start for free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Intuitive Builder</h3>
            <p className="text-slate-600">Drag and drop fields, customize validation, and preview your form in real-time.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Instant Analytics</h3>
            <p className="text-slate-600">View responses as they come in. Export to CSV or JSON with a single click.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Secure by Default</h3>
            <p className="text-slate-600">Enterprise-grade security with Row Level Security and transaction-safe submissions.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
