// TierBadge — shows user's current tier with usage stats and upgrade CTA
// Props: tier ("free"|"pro"|"enterprise"), usageToday, dailyLimit, onUpgrade

export default function TierBadge({ tier = 'free', usageToday = 0, dailyLimit = 10, onUpgrade }) {
  const configs = {
    free: {
      label: 'Free',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.1)',
      border: 'rgba(148,163,184,0.25)',
      icon: '🆓',
    },
    pro: {
      label: 'Pro',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.3)',
      icon: '⚡',
    },
    enterprise: {
      label: 'Enterprise',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.3)',
      icon: '👑',
    },
  }

  const cfg = configs[tier] || configs.free
  const pct = dailyLimit > 0 ? Math.min((usageToday / dailyLimit) * 100, 100) : 0
  const isNearLimit = pct >= 80 && tier === 'free'

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 8,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 14, padding: '10px 16px', minWidth: 200,
    }}>
      {/* Pill header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{cfg.icon}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
            color: cfg.color, textTransform: 'uppercase',
          }}>{cfg.label} Tier</span>
        </div>
        {tier === 'free' && (
          <button
            onClick={onUpgrade}
            style={{
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color: '#fff', border: 'none', borderRadius: 20,
              padding: '3px 10px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 0.3,
              boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
            }}
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      {/* Usage row */}
      <div>
        {tier === 'enterprise' ? (
          <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
            Unlimited runs
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: isNearLimit ? '#ef4444' : '#f1f5f9',
              marginBottom: 5,
            }}>
              {usageToday}/{dailyLimit} runs used today
              {isNearLimit && <span style={{ marginLeft: 6, fontSize: 11, color: '#ef4444' }}>⚠ Near limit</span>}
            </div>
            {/* Progress bar */}
            <div style={{
              height: 4, background: 'rgba(255,255,255,0.08)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 2,
                background: isNearLimit
                  ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                  : `linear-gradient(90deg,${cfg.color},${cfg.color}88)`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
