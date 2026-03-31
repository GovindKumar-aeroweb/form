import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: 'Untitled Form',
    description: '',
    slug: uuidv4().substring(0, 8),
    is_open: true,
    is_public: true,
    success_message: 'Thank you for your submission.'
  });

  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchForm();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();
      
      if (formError) throw formError;
      setForm(formData);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*, form_field_options(*)')
        .eq('form_id', id)
        .order('order_index');
      
      if (fieldsError) throw fieldsError;
      setFields(fieldsData || []);
    } catch (error: any) {
      toast.error('Error loading form');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let formId = id;

      if (!id) {
        // Create new form
        const { data, error } = await supabase
          .from('forms')
          .insert({
            user_id: user.id,
            ...form
          })
          .select()
          .single();
        
        if (error) throw error;
        formId = data.id;
      } else {
        // Update existing form
        const { error } = await supabase
          .from('forms')
          .update(form)
          .eq('id', id);
        if (error) throw error;
      }

      // Save fields
      // For simplicity in MVP, we delete all existing fields and recreate them
      // In a real app, we'd do a proper upsert/delete diff
      if (id) {
        await supabase.from('form_fields').delete().eq('form_id', id);
      }

      if (fields.length > 0) {
        const fieldsToInsert = fields.map((f, i) => ({
          form_id: formId,
          type: f.type,
          label: f.label,
          help_text: f.help_text,
          placeholder: f.placeholder,
          is_required: f.is_required,
          order_index: i,
          field_key: f.field_key || `field_${i}_${Date.now()}`
        }));

        const { data: insertedFields, error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert)
          .select();
        
        if (fieldsError) throw fieldsError;

        // Save options if any
        const optionsToInsert: any[] = [];
        fields.forEach((f, i) => {
          if (f.form_field_options && f.form_field_options.length > 0) {
            const insertedField = insertedFields[i];
            f.form_field_options.forEach((opt: any, j: number) => {
              optionsToInsert.push({
                field_id: insertedField.id,
                label: opt.label,
                value: opt.value || opt.label,
                order_index: j
              });
            });
          }
        });

        if (optionsToInsert.length > 0) {
          const { error: optionsError } = await supabase
            .from('form_field_options')
            .insert(optionsToInsert);
          if (optionsError) throw optionsError;
        }
      }

      toast.success('Form saved successfully');
      if (!id) {
        navigate(`/forms/${formId}/edit`);
      } else {
        fetchForm();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error saving form');
    } finally {
      setSaving(false);
    }
  };

  const addField = (type: string) => {
    setFields([
      ...fields,
      {
        id: uuidv4(),
        type,
        label: `New ${type} field`,
        is_required: false,
        field_key: `field_${Date.now()}`,
        form_field_options: type === 'dropdown' || type === 'radio' ? [{ label: 'Option 1', value: 'Option 1' }] : []
      }
    ]);
  };

  const updateField = (index: number, updates: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[direction === 'up' ? index - 1 : index + 1];
    newFields[direction === 'up' ? index - 1 : index + 1] = temp;
    setFields(newFields);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="text-xl font-bold text-slate-900 border-none focus:ring-0 p-0 bg-transparent w-64"
            placeholder="Form Title"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex gap-6">
        <div className="flex-1 space-y-6">
          {/* Form Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-3xl font-bold text-slate-900 w-full border-none focus:ring-0 p-0 mb-2"
              placeholder="Form Title"
            />
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-slate-600 border-none focus:ring-0 p-0 resize-none"
              placeholder="Form description (optional)"
              rows={2}
            />
          </div>

          {/* Fields List */}
          {fields.map((field, index) => (
            <div key={field.id || index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative group">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <button onClick={() => moveField(index, 'up')} className="p-1 bg-white border border-slate-200 rounded shadow-sm text-slate-400 hover:text-slate-600">↑</button>
                <button onClick={() => moveField(index, 'down')} className="p-1 bg-white border border-slate-200 rounded shadow-sm text-slate-400 hover:text-slate-600">↓</button>
              </div>
              
              <div className="flex justify-between items-start mb-4">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="text-lg font-medium text-slate-900 w-2/3 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-0 p-1"
                  placeholder="Question title"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value })}
                    className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="short_text">Short Text</option>
                    <option value="long_text">Paragraph</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="radio">Multiple Choice</option>
                    <option value="checkbox">Checkboxes</option>
                  </select>
                  <button onClick={() => removeField(index)} className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Field Options (if applicable) */}
              {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox') && (
                <div className="space-y-2 mt-4 pl-2">
                  {(field.form_field_options || []).map((opt: any, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-slate-300 rounded-sm" />
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const newOpts = [...field.form_field_options];
                          newOpts[optIndex] = { ...opt, label: e.target.value, value: e.target.value };
                          updateField(index, { form_field_options: newOpts });
                        }}
                        className="text-sm border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-0 p-1 flex-1"
                        placeholder={`Option ${optIndex + 1}`}
                      />
                      <button
                        onClick={() => {
                          const newOpts = [...field.form_field_options];
                          newOpts.splice(optIndex, 1);
                          updateField(index, { form_field_options: newOpts });
                        }}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newOpts = [...(field.form_field_options || [])];
                      newOpts.push({ label: `Option ${newOpts.length + 1}`, value: `Option ${newOpts.length + 1}` });
                      updateField(index, { form_field_options: newOpts });
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={(e) => updateField(index, { is_required: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Required
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={() => addField('short_text')}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Field
          </button>
        </div>

        {/* Sidebar Settings */}
        <div className="w-72 shrink-0 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Form Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_open}
                  onChange={(e) => setForm({ ...form, is_open: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Accepting Responses
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Success Message</label>
                <textarea
                  value={form.success_message}
                  onChange={(e) => setForm({ ...form, success_message: e.target.value })}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
