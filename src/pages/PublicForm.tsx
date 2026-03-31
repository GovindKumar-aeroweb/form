import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';

type FormRecord = any;
type FieldRecord = any;

export default function PublicForm() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormRecord | null>(null);
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const emailField = useMemo(
    () => fields.find((f) => f.type === 'email'),
    [fields]
  );

  const interactiveFields = useMemo(
    () =>
      fields.filter(
        (f) => !['section_title', 'paragraph_text'].includes(f.type)
      ),
    [fields]
  );

  const answeredCount = useMemo(() => {
    return interactiveFields.filter((field) => {
      const value = answers[field.id];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value === true;
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [answers, interactiveFields]);

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

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateRequiredFields = () => {
    for (const field of fields) {
      if (!field.is_required) continue;
      if (['section_title', 'paragraph_text'].includes(field.type)) continue;

      const value = answers[field.id];
      const emptyArray = Array.isArray(value) && value.length === 0;
      const emptyValue = value === undefined || value === null || value === '';

      if (emptyValue || emptyArray) {
        throw new Error(`Please fill out the required field: ${field.label}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      validateRequiredFields();

      const formattedAnswers = Object.entries(answers).map(([fieldId, value]) => ({
        field_id: fieldId,
        value,
      }));

      const response = await fetch(`/api/submissions/${form.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          submitterEmail: emailField ? answers[emailField.id] || null : null,
        }),
      });

      const text = await response.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned invalid response: ${text.slice(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSubmitted(true);
      toast.success('Form submitted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const shellBg =
    'min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.10),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]';

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';
  const textareaClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 resize-none';
  const cardClass =
    'rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur';

  const renderField = (field: FieldRecord) => {
    if (field.type === 'section_title') {
      return (
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
            Section
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">
            {field.label}
          </h3>
          {field.help_text && (
            <p className="text-sm leading-6 text-slate-500">{field.help_text}</p>
          )}
        </div>
      );
    }

    if (field.type === 'paragraph_text') {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {field.help_text || field.label}
        </div>
      );
    }

    return (
      <>
        <div className="mb-5">
          <label className="block text-[15px] font-semibold text-slate-900">
            {field.label}
            {field.is_required && <span className="ml-1 text-rose-500">*</span>}
          </label>
          {field.help_text && (
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{field.help_text}</p>
          )}
        </div>

        {field.type === 'short_text' && (
          <input
            type="text"
            required={field.is_required}
            placeholder={field.placeholder || 'Enter your answer'}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'long_text' && (
          <textarea
            required={field.is_required}
            rows={5}
            placeholder={field.placeholder || 'Write your answer'}
            className={textareaClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'email' && (
          <input
            type="email"
            required={field.is_required}
            placeholder={field.placeholder || 'name@company.com'}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'phone' && (
          <input
            type="tel"
            required={field.is_required}
            placeholder={field.placeholder || '+91 98765 43210'}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'url' && (
          <input
            type="url"
            required={field.is_required}
            placeholder={field.placeholder || 'https://example.com'}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'number' && (
          <input
            type="number"
            required={field.is_required}
            placeholder={field.placeholder || 'Enter a number'}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'date' && (
          <input
            type="date"
            required={field.is_required}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'time' && (
          <input
            type="time"
            required={field.is_required}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'datetime' && (
          <input
            type="datetime-local"
            required={field.is_required}
            className={inputClass}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'dropdown' && (
          <div className="relative">
            <select
              required={field.is_required}
              defaultValue=""
              className={`${inputClass} appearance-none pr-10`}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            >
              <option value="">Select an option</option>
              {(field.form_field_options || []).map((opt: any) => (
                <option key={opt.id} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        )}

        {field.type === 'radio' && (
          <div className="space-y-3">
            {(field.form_field_options || []).map((opt: any) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 transition hover:border-slate-300 hover:bg-white"
              >
                <input
                  type="radio"
                  name={`field_${field.id}`}
                  required={field.is_required}
                  value={opt.value}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'checkbox' && (
          <div className="space-y-3">
            {(field.form_field_options || []).map((opt: any) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 transition hover:border-slate-300 hover:bg-white"
              >
                <input
                  type="checkbox"
                  value={opt.value}
                  onChange={(e) => {
                    const current = answers[field.id] || [];
                    const newValues = e.target.checked
                      ? [...current, opt.value]
                      : current.filter((v: string) => v !== opt.value);
                    handleInputChange(field.id, newValues);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'rating' && (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              const active = Number(answers[field.id]) === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleInputChange(field.id, value)}
                  className={`h-11 w-11 rounded-2xl border text-sm font-semibold transition ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        )}

        {field.type === 'consent_checkbox' && (
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <input
              type="checkbox"
              required={field.is_required}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm leading-6 text-slate-700">
              {field.help_text || field.label}
            </span>
          </label>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className={`${shellBg} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-6xl animate-pulse lg:grid lg:grid-cols-[320px,1fr] lg:gap-8">
          <div className="hidden rounded-[32px] bg-slate-900/95 p-8 lg:block">
            <div className="h-6 w-32 rounded bg-white/10" />
            <div className="mt-8 h-4 w-40 rounded bg-white/10" />
            <div className="mt-3 h-24 rounded-2xl bg-white/10" />
          </div>
          <div className="space-y-5">
            <div className="rounded-[32px] bg-white p-8 shadow-sm">
              <div className="h-8 w-1/2 rounded bg-slate-200" />
              <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
            </div>
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="h-5 w-1/3 rounded bg-slate-200" />
              <div className="mt-5 h-12 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${shellBg} flex items-center justify-center px-4 py-12`}>
        <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Form unavailable
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`${shellBg} flex items-center justify-center px-4 py-12`}>
        <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Response submitted
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {form?.success_message || 'Thank you for your submission.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shellBg} px-4 py-8 sm:px-6 lg:px-8 lg:py-10`}>
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[320px,1fr] lg:gap-8">
        <aside className="mb-6 overflow-hidden rounded-[32px] bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] lg:sticky lg:top-8 lg:mb-0 lg:h-fit">
          <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 p-[1px]">
            <div className="rounded-t-[32px] bg-slate-950 px-7 py-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Premium form
                  </p>
                  <p className="text-sm text-slate-300">Secure response flow</p>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Progress
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-3xl font-semibold">
                    {answeredCount}
                    <span className="text-base font-medium text-slate-400">
                      /{interactiveFields.length}
                    </span>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {interactiveFields.length === 0
                      ? 'Ready'
                      : `${Math.round((answeredCount / interactiveFields.length) * 100)}%`}
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 transition-all"
                    style={{
                      width:
                        interactiveFields.length === 0
                          ? '0%'
                          : `${(answeredCount / interactiveFields.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                    <LockKeyhole className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Private and secure</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      Clean submission flow with a more product-style experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main>
          <div className="mb-5 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500" />
            <div className="p-7 sm:p-10">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Response form
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {form?.title}
              </h1>
              {form?.description && (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {form.description}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map((field) => (
              <div key={field.id} className={cardClass}>
                {renderField(field)}
              </div>
            ))}

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit response'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    const formEl = document.querySelector('form') as HTMLFormElement | null;
                    formEl?.reset();
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  Clear form
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
