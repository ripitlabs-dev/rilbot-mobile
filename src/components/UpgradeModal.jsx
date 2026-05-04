// UpgradeModal — pricing modal showing 3 tiers side by side
// Props: open (bool), onClose (fn)
// USD prices shown alongside RILCOIN equivalents

const RIL_PER_USD = 10 // 1 USD = 10 RIL (illustrative)

const TIERS = [
  {
    key: 'free',
    name: 'Free',
    icon: '🆓',
    usd: 0,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.15)',
    features: [
      '10 runs / day',
      'All 187 agents',
      'Community support',
      'Standard response time',
    ],
    cta: 'Current Plan',
    ctaVariant: 'ghost',
  },
  {
    key: 'pro',
    name: 'Pro',
    icon: '⚡',
    usd: 49,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
    popular: true,
    features: [
      '500 runs / day',
      'All 187 agents',
      'API access',
      'Priority support',
      'Custom agent builder',
    ],
    cta: 'Get Started',
    ctaVariant: 'primary',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    icon: '👑',
    usd: 299,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.3)',
    features: [
      'Unlimited runs',
      'Custom agents',
      'White-label options',
      'Dedicated SLA',
      'Onboarding support',
      'Invoice billing',
    ],
    cta: 'Get Started',
    ctaVariant: 'gold',
  },
]

export default function UpgradeModal({ open, onClose }) {
  if (!open) return null

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        background: '#0d0f17',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, width: '100%', maxWidth: 860,
        maxHeight: '92vh', overflowY: 'auto', padding: '40px 36px',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#94a3b8',
            width: 36, height: 36, cursor: 'pointer', fontSize: 18,
          }}
        >×</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 40, padding: '5px 16px', marginBottom: 16,
          }}>
            <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, letterSpacing: 0.5 }}>CHOOSE YOUR PLAN</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 10 }}>
            Unlock the full power of
            <span style={{ background: 'linear-gradient(135deg,#3b82f6,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}> RILBOT</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15 }}>Pay in USD or RILCOIN — your choice</p>
        </div>

        {/* Tier cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {TIERS.map(tier => (
            <div
              key={tier.key}
              style={{
                background: tier.bg,
                border: `2px solid ${tier.popular ? tier.color : tier.border}`,
                borderRadius: 18, padding: 28,
                position: 'relative', overflow: 'hidden',
                boxShadow: tier.popular ? `0 0 40px ${tier.color}22` : 'none',
                transition: 'transform 0.2s',
              }}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  color: '#fff', borderRadius: 20,
                  padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                }}>MOST POPULAR</div>
              )}

              {/* Icon + name */}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{tier.icon}</div>
              <div style={{ fontSize: 11, color: tier.color, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{tier.name}</div>

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                {tier.usd === 0 ? (
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: '#f1f5f9' }}>$0</div>
                ) : (
                  <>
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: '#f1f5f9' }}>
                      ${tier.usd}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>/mo</span>
                    </div>
                    <div style={{
                      marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 8, padding: '3px 10px',
                    }}>
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                        or {tier.usd * RIL_PER_USD} RIL/mo
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Features */}
              <div style={{ marginBottom: 24 }}>
                {tier.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: tier.color, fontSize: 13, flexShrink: 0 }}>✓</span>
                    <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={tier.key !== 'free' ? () => alert(`${tier.name} plan — payment flow coming soon!`) : undefined}
                disabled={tier.key === 'free'}
                style={{
                  width: '100%', padding: '12px 0',
                  borderRadius: 10, fontWeight: 700, fontSize: 14,
                  cursor: tier.key === 'free' ? 'default' : 'pointer',
                  border: 'none', transition: 'all 0.2s',
                  opacity: tier.key === 'free' ? 0.5 : 1,
                  ...(tier.ctaVariant === 'primary'
                    ? { background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }
                    : tier.ctaVariant === 'gold'
                    ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }),
                }}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 28 }}>
          All plans include access to all 187 specialist agents. RILCOIN price is illustrative and based on current market rate.
          Cancel any time. Not investment advice.
        </p>
      </div>
    </div>
  )
}
