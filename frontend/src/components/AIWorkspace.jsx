import React, { useState } from 'react';
import { 
  ArrowUp, ArrowDown, Plus, Trash2, Shield, 
  Settings2, Eye, Cpu, Database, Save,
  Share2, Copy, Download, X, ExternalLink,
  Palette, Upload, Image
} from 'lucide-react';

export default function AIWorkspace({ activeForm, selectForm, onNavigate, forms, setForms, authHeaders = {} }) {
  const [fields, setFields] = useState(
    typeof activeForm.schema_fields === 'string' 
      ? JSON.parse(activeForm.schema_fields) 
      : activeForm.schema_fields || []
  );
  
  const [title, setTitle] = useState(activeForm.title);
  const [objective, setObjective] = useState(activeForm.objective);
  const [guardrails, setGuardrails] = useState(
    typeof activeForm.guardrails === 'string'
      ? JSON.parse(activeForm.guardrails)
      : activeForm.guardrails || { system_instructions: 'Be helpful and concise.', topics_allowed: 'General feedback' }
  );
  
  const [settings, setSettings] = useState(
    typeof activeForm.settings === 'string'
      ? JSON.parse(activeForm.settings)
      : activeForm.settings || { allow_voice: true, fatigue_threshold: 0.7, code_switching: true }
  );

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiBuilding, setIsAiBuilding] = useState(false);

  // Sharing Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadHeaders = { ...authHeaders };
      delete uploadHeaders['Content-Type'];
      delete uploadHeaders['content-type'];

      const response = await fetch('/api/forms/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setSettings(prev => ({ ...prev, logo_url: data.url }));
    } catch (err) {
      console.error("Logo upload error:", err);
      alert("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadHeaders = { ...authHeaders };
      delete uploadHeaders['Content-Type'];
      delete uploadHeaders['content-type'];

      const response = await fetch('/api/forms/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setSettings(prev => ({ ...prev, banner_url: data.url, banner_gradient: null }));
    } catch (err) {
      console.error("Banner upload error:", err);
      alert("Failed to upload banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const getShareLink = (formId) => {
    const origin = window.location.origin;
    return `${origin}/fill?id=${formId}`;
  };

  const getEmbedCode = (formId) => {
    return `<iframe src="${getShareLink(formId)}" width="100%" height="600" frameborder="0" style="border:1px solid #1e1e24; border-radius:12px;"></iframe>`;
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  // Field edit functions
  const updateField = (index, updated) => {
    const nextFields = [...fields];
    nextFields[index] = { ...nextFields[index], ...updated };
    setFields(nextFields);
  };

  const deleteField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const addField = () => {
    const newField = {
      id: `field_${Math.random().toString(36).substr(2, 5)}`,
      label: "New Question Label",
      type: "text",
      required: false,
      description: "Explain what you want to extract"
    };
    setFields([...fields, newField]);
  };

  const moveField = (index, direction) => {
    const nextFields = [...fields];
    if (direction === 'up' && index > 0) {
      const temp = nextFields[index];
      nextFields[index] = nextFields[index - 1];
      nextFields[index - 1] = temp;
    } else if (direction === 'down' && index < fields.length - 1) {
      const temp = nextFields[index];
      nextFields[index] = nextFields[index + 1];
      nextFields[index + 1] = temp;
    }
    setFields(nextFields);
  };

  const handleSave = async () => {
    const updatedForm = {
      ...activeForm,
      title,
      objective,
      schema_fields: fields,
      guardrails,
      settings
    };

    try {
      const response = await fetch(`/api/forms/${activeForm.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          title,
          objective,
          schema_fields: fields,
          guardrails,
          settings
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      selectForm(data);
      if (setForms) {
        setForms(prevForms => prevForms.map(f => f.id === data.id ? data : f));
      }
      setShowShareModal(true);
    } catch (err) {
      console.error("Error saving form:", err);
      // Fallback update parent state
      selectForm(updatedForm);
      if (setForms) {
        setForms(prevForms => prevForms.map(f => f.id === updatedForm.id ? updatedForm : f));
      }
      setShowShareModal(true);
    }
  };

  const handleAiBuildRequest = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiBuilding(true);

    try {
      const response = await fetch(`/api/forms/${activeForm.id}/refine`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Load generated form configs into current state
      setTitle(data.title);
      setObjective(data.objective);
      setFields(data.schema_fields);
      setGuardrails(data.guardrails);
      setSettings(data.settings);
      setAiPrompt('');

      // Keep active state synchronized
      selectForm(data);
      if (setForms) {
        setForms(prevForms => prevForms.map(f => f.id === data.id ? data : f));
      }
    } catch (err) {
      console.error("AI Build Error:", err);
      alert("Failed to connect to AI Builder. Running local prompt simulator...");
      
      // Local simulated AI builder
      const simulatedForm = {
        ...activeForm,
        title: `AI Generated: ${aiPrompt.slice(0, 25)}`,
        objective: `Collect qualitative analytics on: ${aiPrompt}`,
        schema_fields: [
          { id: "satisfaction", label: "Satisfaction Level", type: "choice", choices: ["Extremely satisfied", "Satisfied", "Dissatisfied"], required: true, description: "Check satisfaction" },
          { id: "reason", label: "Specific Reasons", type: "text", required: true, description: "Detailed triggers or bottlenecks" }
        ]
      };
      
      setTitle(simulatedForm.title);
      setObjective(simulatedForm.objective);
      setFields(simulatedForm.schema_fields);
      setAiPrompt('');

      selectForm(simulatedForm);
      if (setForms) {
        setForms(prevForms => prevForms.map(f => f.id === simulatedForm.id ? simulatedForm : f));
      }
    } finally {
      setIsAiBuilding(false);
    }
  };

  return (
    <div className="workspace-layout">
      {/* LEFT PANEL: Editor Card List */}
      <div className="scroll-pane" style={{ paddingRight: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button className="button-secondary" onClick={() => onNavigate('dashboard')}>
            ← Back to Dashboard
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="button-primary" onClick={handleSave}>
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>

        {/* Form Meta details */}
        <div className="card-container" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                FORM TITLE
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                style={{ fontSize: '1.3rem', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                CONVERSATIONAL OBJECTIVE (What the AI should extract)
              </label>
              <textarea 
                className="input-field" 
                rows="3" 
                value={objective} 
                onChange={e => setObjective(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Google Forms Questions Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Extraction Targets</h3>
            <button className="button-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={addField}>
              <Plus size={14} /> Add Target Variable
            </button>
          </div>

          <div className="form-card-editor">
            {fields.map((field, idx) => (
              <div className="editor-card active" key={field.id}>
                {/* Visual order actions */}
                <div className="editor-card-actions">
                  <button className="button-icon" style={{ width: '28px', height: '28px' }} onClick={() => moveField(idx, 'up')} disabled={idx === 0}>
                    <ArrowUp size={14} />
                  </button>
                  <button className="button-icon" style={{ width: '28px', height: '28px' }} onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1}>
                    <ArrowDown size={14} />
                  </button>
                  <button className="button-icon" style={{ width: '28px', height: '28px', color: 'var(--error)' }} onClick={() => deleteField(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="editor-field-grid">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Variable Label (Question Prompt)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={field.label} 
                      onChange={e => updateField(idx, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                    <select 
                      className="input-field" 
                      value={field.type} 
                      onChange={e => updateField(idx, { type: e.target.value, choices: e.target.value === 'choice' ? [] : null })}
                      style={{ height: '38px', background: 'var(--bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                    >
                      <option value="text">Free Text</option>
                      <option value="number">Numeric Range</option>
                      <option value="choice">Multiple Choice</option>
                      <option value="url">Website URL</option>
                      <option value="picture">Picture / Photo</option>
                      <option value="file">Document File</option>
                    </select>
                  </div>
                </div>

                <div className="editor-field-grid align-center">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Target Extraction Description</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={field.description || ''} 
                      onChange={e => updateField(idx, { description: e.target.value })}
                      placeholder="Guidance for what to look for..."
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input 
                      type="checkbox" 
                      id={`req_${field.id}`} 
                      checked={field.required || false} 
                      onChange={e => updateField(idx, { required: e.target.checked })}
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor={`req_${field.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Required Field</label>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Conversational Pacing Question (AI-Planned Flow)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={field.pacing_question || ''} 
                    onChange={e => updateField(idx, { pacing_question: e.target.value })}
                    placeholder="e.g. To start off, could you tell me X?"
                  />
                </div>

                {field.type === 'choice' && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--card-border)', paddingTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Options (comma separated)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={field.choices ? field.choices.join(', ') : ''} 
                      onChange={e => updateField(idx, { choices: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="e.g. Yes, No, Maybe"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic settings */}
        <div className="card-container" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
            <Settings2 size={18} className="kpi-icon" /> AI Survey Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                COMPANY / PROJECT NAME
              </label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Stripe, Supabase, Acme Corp"
                value={settings.company_name || ''} 
                onChange={e => setSettings({ ...settings, company_name: e.target.value })} 
                style={{ fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Allow Audio Voice Notes</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Respondents can press a mic to speak their answers.</span>
              </div>
              <input 
                type="checkbox" 
                checked={settings.allow_voice} 
                onChange={e => setSettings({ ...settings, allow_voice: e.target.checked })}
                style={{ scale: '1.3', accentColor: 'var(--accent-color)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Multilingual Code-Switching</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI parses local language switches (e.g. Hinglish, Tanglish) seamlessly.</span>
              </div>
              <input 
                type="checkbox" 
                checked={settings.code_switching} 
                onChange={e => setSettings({ ...settings, code_switching: e.target.checked })}
                style={{ scale: '1.3', accentColor: 'var(--accent-color)' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>Fatigue Threshold ({settings.fatigue_threshold})</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trigger dynamic survey completion when respondent shows friction.</span>
                </div>
              </div>
              <input 
                type="range" 
                min="0.3" 
                max="0.9" 
                step="0.05"
                value={settings.fatigue_threshold} 
                onChange={e => setSettings({ ...settings, fatigue_threshold: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-color)' }}
              />
            </div>
          </div>
        </div>

        {/* Custom Branding & Styling */}
        <div className="card-container" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
            <Palette size={18} className="kpi-icon" /> Custom Branding & Styling
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Theme Accent Color */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                ACCENT THEME COLOR
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {[
                  { name: "FormPulse Blue", hex: "#2563eb" },
                  { name: "Supabase Green", hex: "#3ecf8e" },
                  { name: "Stripe Purple", hex: "#635bff" },
                  { name: "Tailwind Blue", hex: "#0ea5e9" },
                  { name: "Tomato Red", hex: "#ef4444" },
                  { name: "Vercel Black", hex: "#111111" }
                ].map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSettings({ ...settings, theme_color: c.hex })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: settings.theme_color === c.hex ? '3px solid var(--text-primary)' : '1px solid var(--card-border)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    title={c.name}
                  />
                ))}
                {/* Custom Color Input Wrapper */}
                <div style={{
                  position: 'relative',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--card-border)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <input
                    type="color"
                    value={settings.theme_color || '#2563eb'}
                    onChange={e => setSettings({ ...settings, theme_color: e.target.value })}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '-5px',
                      width: '42px',
                      height: '42px',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                    title="Custom Color"
                  />
                </div>
              </div>
            </div>

            {/* Brand Logo Upload */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                BRAND LOGO / AVATAR
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--bg-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Image size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <label className="button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
                  <Upload size={14} /> {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  <input type="file" onChange={handleLogoUpload} accept="image/*" style={{ display: 'none' }} disabled={uploadingLogo} />
                </label>
                {settings.logo_url && (
                  <button type="button" className="button-icon" style={{ color: 'var(--error)', fontSize: '0.75rem' }} onClick={() => setSettings({ ...settings, logo_url: null })}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Form Banner Upload & Presets */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                HEADER BANNER IMAGE
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Banner Preview */}
                <div style={{
                  height: '80px',
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid var(--card-border)',
                  overflow: 'hidden',
                  background: settings.banner_url 
                    ? `url(${settings.banner_url}) center/cover no-repeat` 
                    : settings.banner_gradient || 'var(--card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!settings.banner_url && !settings.banner_gradient && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Banner Configured</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
                    <Upload size={14} /> {uploadingBanner ? "Uploading..." : "Upload Banner"}
                    <input type="file" onChange={handleBannerUpload} accept="image/*" style={{ display: 'none' }} disabled={uploadingBanner} />
                  </label>
                  {(settings.banner_url || settings.banner_gradient) && (
                    <button type="button" className="button-icon" style={{ color: 'var(--error)', fontSize: '0.75rem' }} onClick={() => setSettings({ ...settings, banner_url: null, banner_gradient: null })}>
                      Remove
                    </button>
                  )}
                </div>

                {/* Banner Presets */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Or choose a preset gradient banner:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                    {[
                      { name: "Ocean", css: "linear-gradient(135deg, #0ea5e9, #2563eb)" },
                      { name: "Sunset", css: "linear-gradient(135deg, #f97316, #ef4444)" },
                      { name: "Forest", css: "linear-gradient(135deg, #10b981, #047857)" },
                      { name: "Indigo", css: "linear-gradient(135deg, #6366f1, #4f46e5)" },
                      { name: "Dark", css: "linear-gradient(135deg, #1f2937, #111827)" },
                      { name: "Pulse", css: "linear-gradient(135deg, #2563eb, #1d4ed8)" }
                    ].map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSettings({ ...settings, banner_gradient: p.css, banner_url: null })}
                        style={{
                          height: '24px',
                          borderRadius: '4px',
                          background: p.css,
                          border: settings.banner_gradient === p.css ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          color: '#fff',
                          fontWeight: 700,
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Live Schema Compiled preview */}
      <div className="scroll-pane" style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
          
          {/* AI Prompter workspace builder */}
          <div className="card-container" style={{ background: 'rgba(37, 99, 235, 0.03)', border: '1px dashed var(--accent-color)' }}>
            <h4 className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              <Cpu size={16} className="kpi-icon" /> AI Copilot Builder
            </h4>
            <form onSubmit={handleAiBuildRequest} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input-field" 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Request AI to expand: 'add questions for pricing checks'"
                style={{ height: '38px' }}
              />
              <button className="button-primary" style={{ padding: '0 1rem', height: '38px' }} disabled={isAiBuilding}>
                {isAiBuilding ? "Generating..." : "Apply"}
              </button>
            </form>
          </div>

          {/* Compiled Schema Visual JSON */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
              <Database size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              COMPILED TARGET SCHEMA (REAL-TIME CONFIG)
            </label>
            <pre style={{ 
              flex: 1, 
              background: '#040405', 
              color: '#34d399', 
              padding: '1rem', 
              borderRadius: '8px', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.8rem', 
              overflow: 'auto',
              border: '1px solid var(--card-border)' 
            }}>
              {JSON.stringify({
                form_id: activeForm.id,
                title: title,
                objective: objective,
                fields: fields,
                settings: settings
              }, null, 2)}
            </pre>
          </div>

          {/* Core System instructions */}
          <div className="card-container">
            <h4 className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              <Shield size={16} style={{ color: 'var(--success)' }} /> FormPulse Guardrail Settings
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Guardrail Agent Prompt Guidelines</label>
                <textarea 
                  className="input-field" 
                  rows="2" 
                  value={guardrails.system_instructions}
                  onChange={e => setGuardrails({ ...guardrails, system_instructions: e.target.value })}
                  style={{ fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Allowed Topics boundaries</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={guardrails.topics_allowed}
                  onChange={e => setGuardrails({ ...guardrails, topics_allowed: e.target.value })}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHARE / QR CODE MODAL */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', zIndex: 1000 }}>
            <div className="card-title-row">
              <h3>Share & Embed: {title}</h3>
              <button className="button-icon" onClick={() => setShowShareModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              {/* QR Code Container */}
              <div style={{ textAlign: 'center' }}>
                <div className="qr-code-placeholder" style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getShareLink(activeForm.id))}`}
                    alt="Form QR Code"
                    style={{ width: '150px', height: '150px' }}
                  />
                </div>
                <a 
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getShareLink(activeForm.id))}`}
                  target="_blank" 
                  download="qrcode.png"
                  className="button-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={12} /> Save QR Code
                </a>
              </div>

              {/* Share URL */}
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Shareable Web Survey URL (Vercel Wrapper)
                </label>
                <div className="share-url-container">
                  <div className="share-url">{getShareLink(activeForm.id)}</div>
                  <button 
                    className="button-primary" 
                    style={{ padding: '0.6rem 1rem' }}
                    onClick={() => copyToClipboard(getShareLink(activeForm.id), 'link')}
                  >
                    {copiedLink ? "Copied!" : <Copy size={16} />}
                  </button>
                  <a 
                    href={getShareLink(activeForm.id)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="button-secondary" 
                    style={{ padding: '0.6rem 1rem' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* Embed Script code */}
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  HTML Widget Code (Inline Snip Injection)
                </label>
                <div className="share-url-container">
                  <textarea 
                    className="input-field" 
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', height: '60px', resize: 'none' }}
                    readOnly
                    value={getEmbedCode(activeForm.id)}
                  />
                  <button 
                    className="button-primary" 
                    style={{ padding: '0.6rem 1rem' }}
                    onClick={() => copyToClipboard(getEmbedCode(activeForm.id), 'embed')}
                  >
                    {copiedEmbed ? "Copied!" : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
