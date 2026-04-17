import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Settings, LogOut, BarChart3, MoreVertical, Trash2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
      } else {
        setUser(user);
        fetchForms();
      }
    };
    checkUser();
  }, [navigate]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*, submissions(count)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
      toast.success('Form deleted');
      fetchForms();
    } catch (error: any) {
      toast.error('Failed to delete form');
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-bold text-slate-900">FormFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{user?.email}</span>
              <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-700">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Forms</h1>
          <Link
            to="/forms/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Form
          </Link>
        </div>

        {forms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No forms yet</h3>
            <p className="text-slate-500 mb-4">Create your first form to start collecting responses.</p>
            <Link
              to="/forms/new"
              className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Form
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div key={form.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 truncate pr-4">{form.title}</h3>
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${form.is_open ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {form.is_open ? 'Active' : 'Closed'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {form.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      <span>{form.submissions?.[0]?.count || 0} responses</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/forms/${form.id}/edit`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Edit
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link
                      to={`/forms/${form.id}/submissions`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Results
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(form.slug)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                      title="Copy public link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`/f/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                      title="Open form"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50"
                      title="Delete form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
