// AgentBuilderChat — mini chat widget for live-testing a custom agent in the builder
// Props: systemPrompt (string), agentName (string), agentEmoji (string)

import { useState, useRef, useEffect } from 'react'

const API = '/api'

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.15)',
      borderTopColor: '#3b82f6', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', verticalAlign: 'middle',
    }} />
  )
}

export default function AgentBuilderChat({ systemPrompt, agentName = 'Custom Agent', agentEmoji = '🤖' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/v1/run/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: systemPrompt, message: text }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.result || data.message || 'No response received.',
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, overflow: 'hidden',
      minHeight: 320,
    }}>
      {/* Chat header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>{agentEmoji}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{agentName}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Live test — responses use your current system prompt</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
              color: '#64748b', padding: '4px 10px', fontSize: 11, cursor: 'pointer',
            }}
          >Clear</button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 12,
        minHeight: 200, maxHeight: 320,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', fontSize: 13, textAlign: 'center', padding: '24px 0',
          }}>
            Send a message to test your agent
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {msg.role === 'assistant' && (
              <span style={{ fontSize: 20, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end', marginBottom: 2 }}>
                {agentEmoji}
              </span>
            )}
            <div style={{
              maxWidth: '78%',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
                : msg.error
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(255,255,255,0.05)',
              border: msg.role === 'user'
                ? 'none'
                : msg.error
                ? '1px solid rgba(239,68,68,0.3)'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              fontSize: 14, lineHeight: 1.6,
              color: msg.role === 'user' ? '#fff' : msg.error ? '#ef4444' : '#e2e8f0',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{agentEmoji}</span>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px 16px 16px 4px',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Spinner />
              <span style={{ fontSize: 13, color: '#64748b' }}>Thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Ask ${agentName} anything…`}
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 14px',
            color: '#f1f5f9', fontSize: 14, resize: 'none',
            maxHeight: 96, lineHeight: 1.5,
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 18px', fontWeight: 700, fontSize: 14,
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || loading ? 0.5 : 1,
            transition: 'all 0.2s', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            minHeight: 42,
          }}
        >
          {loading ? <Spinner /> : 'Send'}
        </button>
      </div>
    </div>
  )
}
