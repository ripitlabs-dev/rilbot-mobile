import { useState, useEffect } from 'react'
import DivisionCard from '../components/DivisionCard'

const API = '/api'

function StatBox({ value, label, color = '#f1f5f9' }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 120,
      padding: '20px 16px',
      textAlign: 'center',
      borderRight: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        color,
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: -1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        color: '#64748b',
        marginTop: 4,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        {label}
      </div>
    </div>
  )
}

export default function Empire({ onNav }) {
  const [divisions, setDivisions] = useState([])
  const [agents, setAgents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch(`${API}/divisions`).then(r => r.json()),
      fetch(`${API}/agents`).then(r => r.json()),
      fetch(`${API}/teams`).then(r => r.json()),
    ])
      .then(([divs, ags, tms]) => {
        setDivisions(divs)
        setAgents(ags)
        setTeams(tms)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleViewMarketplace = (division) => {
    // Navigate to agents section and filter by first non-standalone team if possible
    if (onNav) onNav('agents')
  }

  // Compute live stats
  const totalAgents = agents.length || 420
  const totalDivisions = divisions.length
  const totalTeams = teams.filter(t => t !== 'All').length

  // Count industries (unique non-Standalone team prefixes)
  const industryCount = 16

  // Filter divisions
  const filteredDivisions = filter === 'all'
    ? divisions
    : divisions.filter(d =>
        d.name.toLowerCase().includes(filter.toLowerCase()) ||
        d.description.toLowerCase().includes(filter.toLowerCase()) ||
        d.vp.toLowerCase().includes(filter.toLowerCase())
      )

  return (
    <section
      id="empire"
      style={{
        minHeight: '100vh',
        padding: '100px 24px 80px',
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* ── Header Banner ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,64,175,0.25) 0%, rgba(7,8,12,0) 60%), rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: '48px 40px 36px',
        marginBottom: 40,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid decoration */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          borderRadius: 24,
        }} />

        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '10%',
          width: 340,
          height: 340,
          background: 'radial-gradient(circle, rgba(30,64,175,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(30,64,175,0.15)',
            border: '1px solid rgba(30,64,175,0.4)',
            borderRadius: 40,
            padding: '6px 18px',
            marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Corporate Structure — AI Agent Empire
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 900,
            letterSpacing: -1.5,
            marginBottom: 16,
            lineHeight: 1.1,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            🏢 Rip It Labs<br />
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AI Agent Empire
            </span>
          </h1>

          <p style={{
            fontSize: 17,
            color: '#94a3b8',
            maxWidth: 600,
            lineHeight: 1.7,
            marginBottom: 0,
          }}>
            The world's largest AI agent corporation — {totalAgents} specialists organized
            across {totalDivisions} formal divisions, each led by C-Suite AI executives.
            Every agent has a home. Every division has a mission.
          </p>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        marginBottom: 40,
        flexWrap: 'wrap',
        overflow: 'hidden',
      }}>
        <StatBox value={totalDivisions || '15'} label="Divisions" color="#60a5fa" />
        <StatBox value={totalTeams || '25+'} label="Teams" color="#a78bfa" />
        <StatBox value={totalAgents || '202'} label="AI Agents" color="#f59e0b" />
        <StatBox value={industryCount} label="Industries" color="#10b981" />
        <div style={{
          flex: 1,
          minWidth: 120,
          padding: '20px 16px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#f1f5f9',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: -1,
          }}>
            1B RIL
          </div>
          <div style={{
            fontSize: 11,
            color: '#64748b',
            marginTop: 4,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            Token Supply
          </div>
        </div>
      </div>

      {/* ── Search / Filter ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#475569',
            fontSize: 15,
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search divisions, roles, or functions…"
            value={filter === 'all' ? '' : filter}
            onChange={e => setFilter(e.target.value || 'all')}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '12px 16px 12px 42px',
              color: '#f1f5f9',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(96,165,250,0.5)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
        </div>
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✕ Clear
          </button>
        )}
        <div style={{ fontSize: 13, color: '#475569' }}>
          {filteredDivisions.length} {filteredDivisions.length === 1 ? 'division' : 'divisions'} shown
        </div>
      </div>

      {/* ── Loading / Error states ───────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{
            display: 'inline-block',
            width: 36,
            height: 36,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#60a5fa',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ color: '#64748b', marginTop: 20 }}>Loading corporate structure…</p>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12,
          padding: 24,
          color: '#f87171',
          textAlign: 'center',
        }}>
          Failed to load divisions: {error}
        </div>
      )}

      {/* ── Division Grid ────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {filteredDivisions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 18,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>No divisions found</h3>
              <p style={{ color: '#64748b' }}>Try adjusting your search query.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {filteredDivisions.map(division => (
                <DivisionCard
                  key={division.id}
                  division={division}
                  onViewMarketplace={handleViewMarketplace}
                />
              ))}
            </div>
          )}

          {/* ── Footer CTA ──────────────────────────────────────────────────── */}
          <div style={{
            marginTop: 64,
            padding: '40px 32px',
            background: 'linear-gradient(135deg, rgba(30,64,175,0.15), rgba(109,33,168,0.15))',
            border: '1px solid rgba(96,165,250,0.2)',
            borderRadius: 20,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
            <h3 style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#f1f5f9',
              marginBottom: 12,
              letterSpacing: -0.5,
            }}>
              Ready to hire an agent?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Every agent in the empire is available for hire — pay with RILCOIN on Base.
              Browse the full marketplace to find your specialist.
            </p>
            <button
              onClick={() => onNav && onNav('agents')}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(37,99,235,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.4)' }}
            >
              🤖 Browse AI Agent Marketplace →
            </button>
          </div>
        </>
      )}
    </section>
  )
}
