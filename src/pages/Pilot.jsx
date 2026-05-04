import { useState } from 'react'

const INDUSTRIES = [
  'Legal', 'Healthcare', 'Real Estate', 'Construction', 'Finance',
  'Non-Profit', 'Restaurant/Hospitality', 'Retail', 'Technology', 'Other'
]

const REFERRAL_SOURCES = [
  'LinkedIn', 'Reddit', 'Friend/Referral', 'Google', 'Twitter/X', 'Other'
]

// ── Shared styles ──────────────────────────────────────────────────────────────
const inp = {
  width: '100%', boxSizing: 'border-box',
  background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '13px 16px', fontSize: 15, color: '#1e293b',
  fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s',
}

const label = {
  display: 'block', fontSize: 13, fontWeight: 700,
  color: '#475569', marginBottom: 6, letterSpacing: 0.3,
  textTransform: 'uppercase',
}

// ── Testimonial placeholder card ──────────────────────────────────────────────
function TestimonialCard({ index }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)',
      borderRadius: 16, padding: '28px 24px', textAlign: 'center', minHeight: 160,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(245,158,11,0.12)', border: '1.5px dashed rgba(245,158,11,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>👤</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', letterSpacing: 0.5 }}>
          PILOT USER TESTIMONIAL
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Coming Soon</div>
      </div>
      <div style={{
        fontSize: 11, color: '#334155', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
        padding: '4px 12px', letterSpacing: 0.5, fontWeight: 600,
      }}>
        SPOT #{index + 1} OPEN
      </div>
    </div>
  )
}

// ── Pain/Solution column ───────────────────────────────────────────────────────
function PainCol({ icon, pain, solution }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, padding: '32px 28px', flex: 1, minWidth: 260,
    }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#ef4444', letterSpacing: 0.4,
        textTransform: 'uppercase', marginBottom: 8,
      }}>THE PROBLEM</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 }}>
        {pain}
      </p>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#10b981', letterSpacing: 0.4,
        textTransform: 'uppercase', marginBottom: 8,
      }}>THE FIX</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.5 }}>
        {solution}
      </p>
    </div>
  )
}

// ── Main Pilot Page ────────────────────────────────────────────────────────────
export default function Pilot() {
  const [form, setForm] = useState({
    full_name: '', business_name: '', email: '',
    industry: '', challenge: '', referral_source: '',
  })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errMsg, setErrMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.business_name || !form.email || !form.industry || !form.challenge) {
      setErrMsg('Please fill in all required fields.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/pilot/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setErrMsg(data.detail || data.message || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#f1f5f9', minHeight: '100vh' }}>

      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #0c1427 60%, #080d1a 100%)',
        padding: '120px 24px 90px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.18) 0%, transparent 65%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: 'auto, 40px 40px, 40px 40px',
        }} />
        {/* Gold orb */}
        <div style={{
          position: 'absolute', bottom: '-80px', right: '5%', width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto' }}>
          {/* Scarcity badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 40, padding: '6px 18px', marginBottom: 32,
          }}>
            <span style={{
              width: 8, height: 8, background: '#ef4444', borderRadius: '50%',
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 700, letterSpacing: 0.5 }}>
              LIMITED BETA — 50 SPOTS TOTAL
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900,
            letterSpacing: -2, lineHeight: 1.05, marginBottom: 24,
          }}>
            Get Free Access to{' '}
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>652 AI Agents</span>
            <br />— Limited Beta Spots
          </h1>

          <p style={{
            fontSize: 'clamp(17px, 2.5vw, 21px)', color: '#94a3b8',
            maxWidth: 660, margin: '0 auto 48px', lineHeight: 1.65,
          }}>
            We're giving <strong style={{ color: '#f1f5f9' }}>50 businesses</strong> free Pro access
            to RILBOT for 30 days. No credit card. No catch.
            Just real AI agents that work.
          </p>

          {/* CTA button */}
          <a href="#apply" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff', fontWeight: 700, fontSize: 18,
            padding: '18px 40px', borderRadius: 14, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(37,99,235,0.45)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            Apply for Free Access →
          </a>

          {/* Trust signals */}
          <div style={{
            display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap',
            marginTop: 40,
          }}>
            {[
              '✓ No credit card required',
              '✓ 30 days free Pro access',
              '✓ Tim reviews every application',
            ].map(t => (
              <span key={t} style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN / SOLUTION ── */}
      <section style={{
        background: '#0b1120',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              color: '#3b82f6', letterSpacing: 1, textTransform: 'uppercase',
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 20, padding: '4px 14px', marginBottom: 16,
            }}>WHY RILBOT</div>
            <h2 style={{
              fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800,
              letterSpacing: -1, marginBottom: 0,
            }}>
              Your business deserves expert guidance.<br />
              <span style={{ color: '#f59e0b' }}>Not $300/hr consultant bills.</span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <PainCol
              icon="💸"
              pain="Stop paying $300/hr for consultants"
              solution="Your AI Legal Team is $0 during the pilot"
            />
            <PainCol
              icon="⏰"
              pain="Stop waiting days for answers"
              solution="Get expert analysis in under 60 seconds"
            />
            <PainCol
              icon="🤝"
              pain="Stop guessing — get expert guidance"
              solution="652 specialists across 60 industries"
            />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TESTIMONIALS ── */}
      <section style={{
        background: 'linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              color: '#10b981', letterSpacing: 1, textTransform: 'uppercase',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 20, padding: '4px 14px', marginBottom: 16,
            }}>SOCIAL PROOF</div>
            <h2 style={{
              fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: -1,
            }}>
              Join businesses already using RILBOT
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, marginTop: 12 }}>
              5 pilot spots filling now. Be part of the founding cohort.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 20,
          }}>
            {[0, 1, 2, 3, 4].map(i => <TestimonialCard key={i} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── PILOT SIGNUP FORM ── */}
      <section id="apply" style={{
        background: '#f8fafc', padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Form header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              color: '#2563eb', letterSpacing: 1, textTransform: 'uppercase',
              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 20, padding: '4px 14px', marginBottom: 16,
            }}>FREE PILOT APPLICATION</div>
            <h2 style={{
              fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800,
              color: '#0f172a', letterSpacing: -1, marginBottom: 12,
            }}>
              Apply for Free 30-Day Access
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6 }}>
              Tim personally reviews every application and responds within 24 hours.
              This is real — not an automated funnel.
            </p>
          </div>

          {status === 'success' ? (
            /* ── SUCCESS STATE ── */
            <div style={{
              background: '#fff', border: '2px solid #10b981', borderRadius: 20,
              padding: '52px 40px', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(16,185,129,0.12)',
            }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
              <h3 style={{
                fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 12,
              }}>
                You're on the list!
              </h3>
              <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.65, marginBottom: 28 }}>
                Tim will personally review your application and reach out within 24 hours.
              </p>
              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 12, padding: '16px 20px',
                fontSize: 14, color: '#047857', fontWeight: 600,
              }}>
                ✓ Application received · Keep an eye on your email
              </div>
            </div>
          ) : (
            /* ── FORM ── */
            <form onSubmit={handleSubmit} style={{
              background: '#fff', borderRadius: 20, padding: '44px 40px',
              boxShadow: '0 20px 60px rgba(15,23,42,0.10)',
              border: '1px solid #e2e8f0',
            }}>

              {/* Full Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={label}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text" required placeholder="Jane Smith"
                  value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  style={inp}
                />
              </div>

              {/* Business Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={label}>Business Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text" required placeholder="Acme Construction LLC"
                  value={form.business_name} onChange={e => set('business_name', e.target.value)}
                  style={inp}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={label}>Work Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="email" required placeholder="jane@acmeconstruction.com"
                  value={form.email} onChange={e => set('email', e.target.value)}
                  style={inp}
                />
              </div>

              {/* Industry */}
              <div style={{ marginBottom: 20 }}>
                <label style={label}>Industry <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  required value={form.industry} onChange={e => set('industry', e.target.value)}
                  style={{ ...inp, cursor: 'pointer', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                    paddingRight: 40,
                  }}
                >
                  <option value="">Select your industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* Challenge */}
              <div style={{ marginBottom: 20 }}>
                <label style={label}>
                  Biggest Business Challenge <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required rows={4}
                  placeholder="In 2-3 sentences, describe the biggest challenge you're facing in your business right now…"
                  value={form.challenge} onChange={e => set('challenge', e.target.value)}
                  style={{ ...inp, resize: 'vertical', minHeight: 100 }}
                />
              </div>

              {/* Referral source */}
              <div style={{ marginBottom: 32 }}>
                <label style={label}>How did you hear about us?</label>
                <select
                  value={form.referral_source} onChange={e => set('referral_source', e.target.value)}
                  style={{ ...inp, cursor: 'pointer', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                    paddingRight: 40,
                  }}
                >
                  <option value="">Select…</option>
                  {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Error message */}
              {status === 'error' && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, padding: '12px 16px',
                  fontSize: 14, color: '#b91c1c', marginBottom: 20,
                }}>
                  {errMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%', padding: '16px 24px', fontSize: 17,
                  fontWeight: 700, borderRadius: 12, border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  background: status === 'loading'
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  boxShadow: status === 'loading' ? 'none' : '0 6px 24px rgba(37,99,235,0.4)',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {status === 'loading' ? 'Submitting…' : 'Apply for Free 30-Day Access'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 16 }}>
                No credit card. No spam. Tim personally reads every submission.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER STRIP ── */}
      <div style={{
        background: '#0f172a', padding: '32px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>
          © {new Date().getFullYear()} Rip It Labs · RILBOT · Built with AI, powered by RILCOIN
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        #apply input:focus, #apply select:focus, #apply textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        a[href="#apply"]:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(37,99,235,0.55) !important;
        }
      `}</style>
    </div>
  )
}
