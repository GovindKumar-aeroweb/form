```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

export default function PublicForm() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  const emailField = useMemo(
    () => fields.find((f) => f.type === 'email'),
    [fields]
  );

  useEffect(() => {
    const loadForm = async () => {
      try {
        const { data: formData } = await supabase
          .from('forms')
          .select('*')
          .eq('slug', slug)
          .single();

        if (!formData) throw new Error('Form not found');

        if (!formData.is_open || formData.is_archived) {
          setError('This form is no longer accepting responses.');
          return;
        }

        setForm(formData);

        const { data: fieldsData } = await supabase
          .from('form_fields')
          .select('*, form_field_options(*)')
          .eq('form_id', formData.id)
          .order('order_index');

        setFields(fieldsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [slug]);

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers((prev: any) => ({ ...prev, [fieldId]: value }));
  };

  const validateRequiredFields = () => {
    for (const field of fields) {
      if (!field.is_required) continue;
      const value = answers[field.id];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        throw new Error(`Fill required field: ${field.label}`);
      }
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form) return;

    setSubmitting(true);

    try {
      validateRequiredFields();

      const formattedAnswers = Object.entries(answers).map(
        ([fieldId, value]) => ({
          field_id: fieldId,
          value,
        })
      );

      const response = await fetch(
        "https://waofwhekmpvuhqffoxwb.supabase.co/functions/v1/submit-form",
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: form.id,
            answers: formattedAnswers,
            submitterEmail: emailField ? answers[emailField.id] || null : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submit failed');
      }

      setSubmitted(true);
      toast.success('Form submitted');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    return (
      <div className="mb-6">
        <label htmlFor={field.id} className="font-semibold block mb-2">
          {field.label}
        </label>

        {field.type === 'short_text' && (
          <input
            id={field.id}
            name={field.id}
            type="text"
            className="border p-2 w-full"
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'email' && (
          <input
            id={field.id}
            name={field.id}
            type="email"
            className="border p-2 w-full"
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'long_text' && (
          <textarea
            id={field.id}
            name={field.id}
            className="border p-2 w-full"
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'dropdown' && (
          <select
            id={field.id}
            name={field.id}
            className="border p-2 w-full"
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          >
            <option value="">Select</option>
            {field.form_field_options?.map((opt: any) => (
              <option key={opt.id} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  if (submitted) {
    return <div>✅ Submitted Successfully</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">{form?.title}</h1>

      <form onSubmit={handleSubmit}>
        {fields.map((f) => (
          <div key={f.id}>{renderField(f)}</div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
```
