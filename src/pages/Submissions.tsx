import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileText, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export default function Submissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load form
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', id)
          .single();

        if (formError) throw formError;
        setForm(formData);

        // Load fields
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', id)
          .order('order_index');

        if (fieldsError) throw fieldsError;
        setFields(fieldsData || []);

        // Load submissions with answers
        const { data: submissionsData, error: subError } = await supabase
          .from('submissions')
          .select('*, submission_answers(*)')
          .eq('form_id', id)
          .order('created_at', { ascending: false });

        if (subError) throw subError;
        setSubmissions(submissionsData || []);

      } catch (error: any) {
        toast.error('Failed to load submissions');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const exportCSV = () => {
    if (!submissions.length) return;

    const headers = ['Submission ID', 'Date', 'Email', ...fields.map(f => f.label)];
    
    const rows = submissions.map(sub => {
      const row = [
        sub.id,
        new Date(sub.created_at).toISOString(),
        sub.submitter_email || 'Anonymous',
      ];

      fields.forEach(field => {
        const answer = sub.submission_answers.find((a: any) => a.field_id === field.id);
        let val = answer ? answer.value : '';
        if (Array.isArray(val)) val = val.join(', ');
        // Escape quotes
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        row.push(val);
      });

      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${form.slug}_submissions.csv`;
    link.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{form?.title}</h1>
            <p className="text-sm text-slate-500">{submissions.length} responses</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/forms/${form.id}/edit`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-md"
          >
            Edit Form
          </Link>
          <button
            onClick={exportCSV}
            disabled={submissions.length === 0}
            className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center mt-8">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No responses yet</h3>
            <p className="text-slate-500">Share your form link to start collecting responses.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Submitter
                    </th>
                    {fields.map(field => (
                      <th key={field.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap max-w-xs truncate">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {format(new Date(sub.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {sub.submitter_email || 'Anonymous'}
                      </td>
                      {fields.map(field => {
                        const answer = sub.submission_answers.find((a: any) => a.field_id === field.id);
                        let val = answer ? answer.value : '-';
                        if (Array.isArray(val)) val = val.join(', ');
                        
                        return (
                          <td key={field.id} className="px-6 py-4 text-sm text-slate-900 max-w-xs truncate" title={String(val)}>
                            {String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
