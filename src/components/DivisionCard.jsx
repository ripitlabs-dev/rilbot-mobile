import { useState } from 'react'

function TeamPill({ name, color }) {
  const isStandalone = name.startsWith('Standalone:')
  const label = isStandalone ? name.replace('Standalone:', '') : name
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: isStandalone ? 'rgba(37,99,235,0.12)' : color + '18',
      color: isStandalone ? '#60a5fa' : color,
      border: `1px solid ${isStandalone ? 'rgba(37,99,235,0.25)' : color + '35'}`,
      letterSpacing: 0.2,
    }}>
      {isStandalone ? '⚡ ' : ''}{label}
    </span>
  )
}

export default function DivisionCard({ division, onViewMarketplace }) {
  const [expanded, setExpanded] = useState(false)
  const teamCount = division.teams.length

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${expanded ? division.color + '55' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'pointer',
        boxShadow: expanded
          ? `0 8px 40px ${division.color}28, 0 0 0 1px ${division.color}22`
          : 'none',
        transform: expanded ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={e => {
        if (!expanded) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = `0 12px 40px ${division.color}33`
          e.currentTarget.style.borderColor = division.color + '44'
        }
      }}
      onMouseLeave={e => {
        if (!expanded) {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        }
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${division.color}, ${division.color}55)`,
      }} />

      {/* Card header — always visible */}
      <div
        style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
        onClick={() => setExpanded(x => !x)}
      >
        {/* Top row: emoji + expand toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{
            fontSize: 36,
            lineHeight: 1,
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: division.color + '18',
            borderRadius: 14,
            border: `1px solid ${division.color}30`,
          }}>
            {division.emoji}
          </div>
          <div style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 8,
            fontSize: 14,
            color: '#64748b',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}>
            ▾
          </div>
        </div>

        {/* Name + VP */}
        <div>
          <h3 style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#f1f5f9',
            marginBottom: 4,
            letterSpacing: -0.3,
            lineHeight: 1.3,
          }}>
            {division.name}
          </h3>
          <div style={{
            fontSize: 12,
            color: division.color,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}>
            {division.vp}
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 13,
          color: '#94a3b8',
          lineHeight: 1.6,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
        }}>
          {division.description}
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{
            background: division.color + '18',
            color: division.color,
            border: `1px solid ${division.color}30`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}>
            {teamCount} {teamCount === 1 ? 'UNIT' : 'UNITS'}
          </span>
          <span style={{ fontSize: 11, color: '#475569', letterSpacing: 0.3 }}>
            {division.teams.filter(t => !t.startsWith('Standalone:')).length} teams •{' '}
            {division.teams.filter(t => t.startsWith('Standalone:')).length} standalone agents
          </span>
        </div>
      </div>

      {/* Expanded section — teams/agents */}
      {expanded && (
        <div style={{
          padding: '0 24px 24px',
          borderTop: `1px solid ${division.color}20`,
          marginTop: 0,
        }}>
          <div style={{
            paddingTop: 16,
            marginBottom: 14,
            fontSize: 11,
            color: '#475569',
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Teams & Agents
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {division.teams.map(team => (
              <TeamPill key={team} name={team} color={division.color} />
            ))}
          </div>

          {/* View in Marketplace link */}
          <button
            onClick={e => { e.stopPropagation(); onViewMarketplace && onViewMarketplace(division) }}
            style={{
              background: 'none',
              border: `1px solid ${division.color}44`,
              color: division.color,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = division.color + '18'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
            }}
          >
            View in Marketplace →
          </button>
        </div>
      )}
    </div>
  )
}
