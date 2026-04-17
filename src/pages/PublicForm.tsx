import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ShieldCheck,
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
    if (!form) return;

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

  const baseInput =
    'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-[15px] text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';
  const baseTextarea =
    'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-[15px] text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 resize-none';

  const renderField = (field: FieldRecord) => {
    if (field.type === 'section_title') {
      return (
        <div className="pt-2">
          <h3 className="text-xl font-semibold text-neutral-950">{field.label}</h3>
          {field.help_text && (
            <p className="mt-2 text-sm leading-6 text-neutral-500">{field.help_text}</p>
          )}
        </div>
      );
    }

    if (field.type === 'paragraph_text') {
      return (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm leading-6 text-neutral-600">
          {field.help_text || field.label}
        </div>
      );
    }

    return (
      <>
        <div className="mb-3 flex items-start justify-between gap-3">
          <label className="block text-[15px] font-semibold text-neutral-950">
            {field.label}
            {field.is_required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        </div>

        {field.help_text && (
          <p className="mb-4 text-sm leading-6 text-neutral-500">{field.help_text}</p>
        )}

        {field.type === 'short_text' && (
          <input
            type="text"
            required={field.is_required}
            placeholder={field.placeholder || 'Enter your answer'}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'long_text' && (
          <textarea
            required={field.is_required}
            rows={5}
            placeholder={field.placeholder || 'Write your answer'}
            className={baseTextarea}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'email' && (
          <input
            type="email"
            required={field.is_required}
            placeholder={field.placeholder || 'name@company.com'}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'phone' && (
          <input
            type="tel"
            required={field.is_required}
            placeholder={field.placeholder || 'Phone number'}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'url' && (
          <input
            type="url"
            required={field.is_required}
            placeholder={field.placeholder || 'https://example.com'}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'number' && (
          <input
            type="number"
            required={field.is_required}
            placeholder={field.placeholder || 'Enter a number'}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'date' && (
          <input
            type="date"
            required={field.is_required}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'time' && (
          <input
            type="time"
            required={field.is_required}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'datetime' && (
          <input
            type="datetime-local"
            required={field.is_required}
            className={baseInput}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'dropdown' && (
          <div className="relative">
            <select
              required={field.is_required}
              defaultValue=""
              className={`${baseInput} appearance-none pr-10`}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            >
              <option value="">Select an option</option>
              {(field.form_field_options || []).map((opt: any) => (
                <option key={opt.id} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        )}

        {field.type === 'radio' && (
          <div className="space-y-3">
            {(field.form_field_options || []).map((opt: any) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 transition hover:border-neutral-400"
              >
                <input
                  type="radio"
                  name={`field_${field.id}`}
                  required={field.is_required}
                  value={opt.value}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="h-4 w-4 border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-neutral-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'checkbox' && (
          <div className="space-y-3">
            {(field.form_field_options || []).map((opt: any) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 transition hover:border-neutral-400"
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
                  className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-neutral-700">{opt.label}</span>
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
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        )}

        {field.type === 'consent_checkbox' && (
          <label className="flex items-start gap-3 rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-4">
            <input
              type="checkbox"
              required={field.is_required}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm leading-6 text-neutral-700">
              {field.help_text || field.label}
            </span>
          </label>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-10">
        <div className="mx-auto max-w-5xl animate-pulse rounded-[28px] border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="h-8 w-1/3 rounded bg-neutral-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-neutral-100" />
          <div className="mt-8 h-14 rounded-2xl bg-neutral-100" />
          <div className="mt-4 h-14 rounded-2xl bg-neutral-100" />
          <div className="mt-4 h-40 rounded-2xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-950">Form unavailable</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-950">Response submitted</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {form?.success_message || 'Thank you for your submission.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[30px] border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
        <div className="border-b border-neutral-200 px-6 py-8 sm:px-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
            <ShieldCheck className="h-4 w-4" />
            Secure Form
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            {form?.title}
          </h1>
          {form?.description && (
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-neutral-600">
              {form.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {fields.map((field) => {
              const isWide =
                field.type === 'long_text' ||
                field.type === 'paragraph_text' ||
                field.type === 'section_title' ||
                field.type === 'checkbox' ||
                field.type === 'consent_checkbox';

              return (
                <div
                  key={field.id}
                  className={isWide ? 'md:col-span-2' : 'md:col-span-1'}
                >
                  {renderField(field)}
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
