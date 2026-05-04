// AgentBuilder — full-page no-code agent designer
// Route: /builder

import { useState, useEffect, useCallback } from 'react'
import AgentBuilderChat from '../components/AgentBuilderChat'

const API = '/api'

const TEAM_OPTIONS = [
  'Standalone', 'Logistics', 'Wealth', 'Estate', 'Restaurant',
  'Benefits', 'Insurance', 'Corporate', 'HR', 'Engineering',
  'Infrastructure', 'Farm', 'IP Business', 'Contract Law', 'Temp Agency', 'Custom',
]

const YEAR_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30]

const EMOJI_PRESETS = ['🤖','🧠','💼','📊','⚖️','🏗️','🌾','🚛','💰','🏥','🎯','🔬','🛡️','🏦','📋','🔧','🌐','🎓','💡','🚀']

const C = {
  Logistics: '#3b82f6', Wealth: '#10b981', Estate: '#f59e0b',
  Restaurant: '#ef4444', Benefits: '#8b5cf6', Insurance: '#06b6d4',
  Corporate: '#fbbf24', HR: '#ec4899', Engineering: '#64748b',
  Infrastructure: '#78716c', Farm: '#84cc16', 'IP Business': '#6366f1',
  'Contract Law': '#dc2626', 'Temp Agency': '#f97316',
  Standalone: '#2563eb', Custom: '#2563eb',
}

// ── Shared primitives (matches App.jsx style) ──────────────────────────────────
function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600,
    borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'all 0.18s', border: 'none',
    fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16,
    padding: size === 'sm' ? '10px 18px' : size === 'lg' ? '18px 36px' : '13px 26px',
    minHeight: size === 'sm' ? 42 : 48,
  }
  const variants = {
    primary: { background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' },
    gold:    { background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' },
    ghost:   { background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)' },
    green:   { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' },
    danger:  { background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '11px 14px',
  color: '#f1f5f9', fontSize: 15,
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
}

// ── System Prompt Auto-Generator ───────────────────────────────────────────────
function buildSystemPrompt({ roleTitle, industry, yearsExp, capabilities }) {
  if (!roleTitle && !industry && capabilities.length === 0) return ''
  const lines = []
  lines.push(`You are a ${roleTitle || 'specialist'}${yearsExp ? ` with ${yearsExp} years of experience` : ''}${industry ? ` in ${industry}` : ''}.`)
  lines.push('')
  if (capabilities.length > 0) {
    lines.push('Your expertise covers:')
    capabilities.forEach(c => { if (c.trim()) lines.push(`- ${c.trim()}`) })
    lines.push('')
  }
  lines.push(`Always respond with concrete, actionable ${industry || 'professional'} guidance.`)
  return lines.join('\n')
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' }
  const c = colors[toast.type] || '#3b82f6'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999, maxWidth: 420,
      background: '#0d0f17', border: `1px solid ${c}40`, borderLeft: `4px solid ${c}`,
      borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start',
      gap: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'fadeUp 0.3s ease',
    }}>
      <div style={{ flex: 1, fontSize: 14, color: '#f1f5f9', lineHeight: 1.5 }}>{toast.msg}</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>×</button>
    </div>
  )
}

// ── AgentPreview ───────────────────────────────────────────────────────────────
function AgentPreview({ name, emoji, tagline, color, capabilities, rilPrices }) {
  const displayName = name || 'Your Agent'
  const displayEmoji = emoji || '🤖'
  const displayTagline = tagline || 'Your custom AI specialist'
  const displayColor = color || '#2563eb'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 18, padding: 28, position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 40px ${displayColor}22`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${displayColor}, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 40 }}>{displayEmoji}</div>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          background: displayColor + '22', color: displayColor,
          border: `1px solid ${displayColor}44`, textTransform: 'uppercase',
        }}>Custom</span>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#f1f5f9' }}>{displayName}</h3>
      <p style={{ fontSize: 13, color: displayColor, fontWeight: 600, marginBottom: 14 }}>{displayTagline}</p>

      {capabilities.filter(c => c.trim()).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {capabilities.filter(c => c.trim()).slice(0, 5).map((cap, i) => (
            <span key={i} style={{
              background: displayColor + '15', border: `1px solid ${displayColor}30`,
              borderRadius: 20, padding: '4px 12px', fontSize: 12, color: displayColor,
            }}>✓ {cap}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Starting at</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', fontFamily: "'Space Grotesk'" }}>
            {rilPrices.basic || '—'} <span style={{ fontSize: 14 }}>RIL</span>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '10px 18px', fontSize: 14, color: '#94a3b8', fontWeight: 600,
        }}>View & Hire →</div>
      </div>
    </div>
  )
}

// ── AgentBuilder Page ──────────────────────────────────────────────────────────
export default function AgentBuilder({ onNav }) {
  // Basic info
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🤖')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [tagline, setTagline] = useState('')
  const [team, setTeam] = useState('Standalone')
  const [color, setColor] = useState('#2563eb')

  // Persona
  const [roleTitle, setRoleTitle] = useState('')
  const [industry, setIndustry] = useState('')
  const [yearsExp, setYearsExp] = useState(10)

  // Capabilities
  const [capabilities, setCapabilities] = useState([''])

  // System prompt
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptOverridden, setPromptOverridden] = useState(false)

  // Pricing
  const [rilPrices, setRilPrices] = useState({ basic: 50, standard: 150, enterprise: 500 })

  // UI state
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Auto-generate system prompt when persona fields change
  useEffect(() => {
    if (promptOverridden) return
    const generated = buildSystemPrompt({ roleTitle, industry, yearsExp, capabilities })
    setSystemPrompt(generated)
  }, [roleTitle, industry, yearsExp, capabilities, promptOverridden])

  // Sync team color
  useEffect(() => {
    const c = C[team]
    if (c) setColor(c)
  }, [team])

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 6000)
  }, [])

  // Capability management
  const addCapability = () => {
    if (capabilities.length >= 10) return
    setCapabilities(prev => [...prev, ''])
  }
  const removeCapability = (i) => setCapabilities(prev => prev.filter((_, idx) => idx !== i))
  const updateCapability = (i, val) => setCapabilities(prev => prev.map((c, idx) => idx === i ? val : c))

  // Save handler
  const handleSave = async () => {
    if (!name.trim()) return showToast('error', 'Please enter an agent name.')
    if (!roleTitle.trim()) return showToast('error', 'Please enter a role title.')
    if (!systemPrompt.trim()) return showToast('error', 'System prompt cannot be empty.')

    const payload = {
      name: name.trim(),
      emoji,
      tagline: tagline.trim(),
      team,
      color,
      system_prompt: systemPrompt,
      capabilities: capabilities.filter(c => c.trim()),
      ril_price: rilPrices,
    }

    setSaving(true)
    try {
      const res = await fetch(`${API}/custom-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', `Agent "${name}" saved! ID: ${data.agent_id}`)
      } else {
        throw new Error(data.detail || 'Save failed')
      }
    } catch (err) {
      console.log('Custom agent payload (backend not ready):', payload)
      showToast('info', `Agent "${name}" ready! (Backend endpoint not yet live — logged to console)`)
    } finally {
      setSaving(false)
    }
  }

  const activeColor = C[team] || color

  return (
    <div style={{ minHeight: '100vh', paddingTop: 84, background: '#07080c' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page header */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <button
            onClick={() => onNav && onNav('home')}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Back to RILBOT
          </button>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(28px,4vw,38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
            🤖 Custom Agent Builder
          </h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>Design your own AI specialist agent — no code required</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => setShowPreview(v => !v)} variant="ghost" size="sm">
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Btn>
          <Btn onClick={handleSave} variant="gold" size="sm" disabled={saving} style={{ minWidth: 100, justifyContent: 'center' }}>
            {saving ? <><Spinner /> Saving…</> : '💾 Save Agent'}
          </Btn>
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px',
        display: 'grid',
        gridTemplateColumns: showPreview ? '1fr 380px' : '1fr',
        gap: 28, alignItems: 'start',
      }}>

        {/* ── Left: Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Basic Info */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: 28,
          }}>
            <SectionLabel>Basic Info</SectionLabel>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 0 }}>
              <Field label="Agent Name">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Contract Review Specialist"
                  style={inputStyle}
                />
              </Field>

              <Field label="Emoji">
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowEmojiPicker(v => !v)}
                    style={{
                      ...inputStyle, width: 56, textAlign: 'center', fontSize: 22,
                      cursor: 'pointer', padding: '10px 8px',
                    }}
                  >
                    {emoji}
                  </button>
                  {showEmojiPicker && (
                    <div style={{
                      position: 'absolute', top: '110%', left: 0, zIndex: 100,
                      background: '#0d0f17', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, padding: 12, display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}>
                      {EMOJI_PRESETS.map(e => (
                        <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: 6, borderRadius: 6, transition: 'background 0.1s' }}
                        >{e}</button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <Field label="Tagline">
              <input
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Short, punchy description of what this agent does"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Team">
                <select value={team} onChange={e => setTeam(e.target.value)} style={selectStyle}>
                  {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Accent Color">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    style={{ width: 44, height: 42, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'none', padding: 2 }}
                  />
                  <input
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    placeholder="#2563eb"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Agent Persona */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: 28,
          }}>
            <SectionLabel>Agent Persona</SectionLabel>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16 }}>
              <Field label="Role Title">
                <input
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Contract Attorney"
                  style={inputStyle}
                />
              </Field>
              <Field label="Industry">
                <input
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g. Corporate Law"
                  style={inputStyle}
                />
              </Field>
              <Field label="Years Experience">
                <select value={yearsExp} onChange={e => setYearsExp(Number(e.target.value))} style={{ ...selectStyle, width: 100 }}>
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Capabilities */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionLabel>Expertise & Capabilities</SectionLabel>
              <span style={{ fontSize: 12, color: '#64748b' }}>{capabilities.length}/10</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {capabilities.map((cap, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: activeColor, fontSize: 14, flexShrink: 0 }}>✓</span>
                  <input
                    value={cap}
                    onChange={e => updateCapability(i, e.target.value)}
                    placeholder={`Capability ${i + 1}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeCapability(i)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444', borderRadius: 8, width: 34, height: 34,
                      cursor: 'pointer', fontSize: 16, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
              ))}
            </div>

            {capabilities.length < 10 && (
              <button
                onClick={addCapability}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '10px 18px', color: '#94a3b8',
                  fontSize: 14, cursor: 'pointer', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 18 }}>+</span> Add Capability
              </button>
            )}
          </div>

          {/* System Prompt */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <SectionLabel>System Prompt Builder</SectionLabel>
              {promptOverridden && (
                <button
                  onClick={() => setPromptOverridden(false)}
                  style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b', borderRadius: 6, padding: '4px 10px',
                    fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  ↺ Restore Auto-Generated
                </button>
              )}
            </div>
            <p style={{ color: '#475569', fontSize: 13, marginBottom: 14 }}>
              {promptOverridden
                ? 'Manual override active — editing directly.'
                : 'Auto-generated from the fields above. Edit to override.'}
            </p>
            <textarea
              value={systemPrompt}
              onChange={e => { setSystemPrompt(e.target.value); setPromptOverridden(true) }}
              rows={8}
              placeholder="Fill in the fields above to auto-generate a system prompt..."
              style={{
                ...inputStyle, resize: 'vertical', lineHeight: 1.7,
                fontFamily: "'Space Grotesk', monospace", fontSize: 14,
                borderColor: promptOverridden ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {/* Pricing */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: 28,
          }}>
            <SectionLabel>Pricing (RILCOIN)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { key: 'basic', label: 'Basic', desc: 'Quick analysis' },
                { key: 'standard', label: 'Standard', desc: 'Full report' },
                { key: 'enterprise', label: 'Enterprise', desc: 'Deep dive + follow-up' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>{desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      value={rilPrices[key]}
                      onChange={e => setRilPrices(p => ({ ...p, [key]: Number(e.target.value) }))}
                      style={{ ...inputStyle, width: '100%', fontFamily: "'Space Grotesk'", fontWeight: 700, color: '#f59e0b' }}
                    />
                    <span style={{ color: '#64748b', fontSize: 13, flexShrink: 0 }}>RIL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Agent chat */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${activeColor}22`,
            borderRadius: 18, padding: 28,
            boxShadow: `0 0 40px ${activeColor}11`,
          }}>
            <SectionLabel>Test Your Agent</SectionLabel>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Send a message to preview how your agent responds with the current system prompt.
            </p>
            <AgentBuilderChat
              systemPrompt={systemPrompt}
              agentName={name || 'Custom Agent'}
              agentEmoji={emoji}
            />
          </div>

          {/* Save CTA at bottom */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Btn onClick={() => onNav && onNav('home')} variant="ghost">Cancel</Btn>
            <Btn onClick={handleSave} variant="gold" disabled={saving} style={{ minWidth: 140, justifyContent: 'center' }}>
              {saving ? <><Spinner /> Saving…</> : '💾 Save Agent'}
            </Btn>
          </div>
        </div>

        {/* ── Right: Live Preview (conditional) ── */}
        {showPreview && (
          <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 4,
            }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                Live Preview
              </div>
            </div>
            <AgentPreview
              name={name}
              emoji={emoji}
              tagline={tagline}
              color={activeColor}
              capabilities={capabilities}
              rilPrices={rilPrices}
            />

            {/* Prompt preview */}
            {systemPrompt && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: 20,
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  System Prompt Preview
                </div>
                <pre style={{
                  color: '#94a3b8', fontSize: 12, lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'Inter, monospace', margin: 0,
                }}>{systemPrompt}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
