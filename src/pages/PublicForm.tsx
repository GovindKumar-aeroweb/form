import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function PublicForm() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadForm = async () => {
      try {
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('slug', slug)
          .single();

        if (formError || !formData) throw new Error('Form not found');
        
        if (!formData.is_open || formData.is_archived) {
          setError('This form is no longer accepting responses.');
          setLoading(false);
          return;
        }

        setForm(formData);

        const { data: fieldsData, error: fieldsError } = await supabase
          .from('form_fields')
          .select('*, form_field_options(*)')
          .eq('form_id', formData.id)
          .order('order_index');

        if (fieldsError) throw fieldsError;
        setFields(fieldsData || []);
      } catch (err: any) {
        setError(err.message || 'Form not found');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Basic validation
      for (const field of fields) {
        if (field.is_required && !answers[field.id]) {
          throw new Error(`Please fill out the required field: ${field.label}`);
        }
      }

      // Format answers for the backend
      const formattedAnswers = Object.entries(answers).map(([fieldId, value]) => ({
        field_id: fieldId,
        value
      }));

      // Call our secure backend route
      const response = await fetch(`/api/submissions/${form.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // If we had auth, we'd pass the token here
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          submitterEmail: answers['email'] || null // Simplified
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSubmitted(true);
      toast.success('Form submitted successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
          <p className="text-slate-600 mb-6">{form?.success_message || 'Thank you for your submission.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border-t-8 border-t-indigo-600 border-x border-b border-slate-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{form?.title}</h1>
          {form?.description && (
            <p className="text-slate-600 whitespace-pre-wrap">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <label className="block text-base font-medium text-slate-900 mb-1">
                {field.label} {field.is_required && <span className="text-red-500">*</span>}
              </label>
              {field.help_text && (
                <p className="text-sm text-slate-500 mb-4">{field.help_text}</p>
              )}
              
              <div className="mt-4">
                {field.type === 'short_text' && (
                  <input
                    type="text"
                    required={field.is_required}
                    placeholder={field.placeholder || 'Your answer'}
                    className="w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 px-0 py-2 bg-transparent transition-colors"
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}
                
                {field.type === 'long_text' && (
                  <textarea
                    required={field.is_required}
                    placeholder={field.placeholder || 'Your answer'}
                    rows={3}
                    className="w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 px-0 py-2 bg-transparent transition-colors resize-none"
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'email' && (
                  <input
                    type="email"
                    required={field.is_required}
                    placeholder={field.placeholder || 'Your email'}
                    className="w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 px-0 py-2 bg-transparent transition-colors"
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    required={field.is_required}
                    placeholder={field.placeholder || 'Your answer'}
                    className="w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 px-0 py-2 bg-transparent transition-colors"
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'radio' && (
                  <div className="space-y-3">
                    {(field.form_field_options || []).map((opt: any) => (
                      <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`field_${field.id}`}
                          required={field.is_required}
                          value={opt.value}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                        />
                        <span className="text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-3">
                    {(field.form_field_options || []).map((opt: any) => (
                      <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          value={opt.value}
                          onChange={(e) => {
                            const current = answers[field.id] || [];
                            const newVals = e.target.checked 
                              ? [...current, opt.value]
                              : current.filter((v: string) => v !== opt.value);
                            handleInputChange(field.id, newVals);
                          }}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600"
                        />
                        <span className="text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'dropdown' && (
                  <select
                    required={field.is_required}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full md:w-1/2 border border-slate-300 rounded-md shadow-sm focus:border-indigo-600 focus:ring-indigo-600 py-2 px-3"
                  >
                    <option value="">Choose</option>
                    {(field.form_field_options || []).map((opt: any) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-8 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                const form = document.querySelector('form');
                if (form) form.reset();
              }}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Clear form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
