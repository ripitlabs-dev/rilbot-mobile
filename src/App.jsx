import { useState, useEffect, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import EthereumProvider from '@walletconnect/ethereum-provider'
import TierBadge from './components/TierBadge'
import UpgradeModal from './components/UpgradeModal'
import AgentBuilder from './pages/AgentBuilder'
import Empire from './pages/Empire'
import Pilot from './pages/Pilot'
import QRCode from 'qrcode'

// WalletConnect project ID — get a free one at https://cloud.walletconnect.com
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || 'e34177a6bb4b7caf61d2d5a97e9b22d7'

// Coinbase Wallet SDK v4 — lazy init inside click handler to avoid module-level errors
function makeCBProvider() {
  const sdk = new CoinbaseWalletSDK({
    appName: 'RILBOT by Rip It Labs',
    appLogoUrl: 'https://rilbot.ripitlabs.com/icon-192.png',
    appChainIds: [8453],
  })
  return sdk.makeWeb3Provider({ options: 'all' })
}

// WalletConnect provider factory (async — new instance per session)
async function makeWCProvider() {
  return await EthereumProvider.init({
    projectId: WC_PROJECT_ID,
    chains: [8453],
    optionalChains: [1],
    showQrModal: true,
    metadata: {
      name: 'RILBOT by Rip It Labs',
      description: 'AI Agent Marketplace — pay with RILCOIN on Base',
      url: 'https://rilbot.ripitlabs.com',
      icons: ['https://rilbot.ripitlabs.com/icon-192.png'],
    },
  })
}

// ── Constants ──────────────────────────────────────────────────────────────────
const API = '/api'
const LOGO_URL = '/logo_data.txt'   // base64 data URI served from /public

// Testnet — switch to mainnet when deploying to production
const BASE_CHAIN = { id: 8453, hex: '0x2105', name: 'Base', rpc: 'https://mainnet.base.org' }

// Payment conversion: 1 RIL ≈ $0.10 USD at ~$3333/ETH = 0.00003 ETH per RIL
const RIL_PER_ETH = 33333
const RIL_TO_USD  = 0.10   // 1 RIL = $0.10 USD
const TREASURY = '0x7B0D5dE38480213E5f081F5409D448Dbc877D161'

const RIL_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
]

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  // Core business
  Corporate:     '#fbbf24',
  HR:            '#ec4899',
  'Temp Agency': '#f97316',
  'Contract Law':'#dc2626',
  'IP Business': '#6366f1',
  // Finance
  Wealth:        '#10b981',
  Banking:       '#059669',
  Insurance:     '#06b6d4',
  // Operations
  Logistics:     '#3b82f6',
  Infrastructure:'#78716c',
  Manufacturing: '#475569',
  Construction:  '#92400e',
  // Industry
  Engineering:   '#64748b',
  'Software Dev':'#8b5cf6',
  Cybersecurity: '#7c3aed',
  // People & Service
  Benefits:      '#a855f7',
  Healthcare:    '#0ea5e9',
  Dental:        '#38bdf8',
  Wellness:      '#34d399',
  Pharma:        '#2dd4bf',
  Veterinary:    '#4ade80',
  // Property & Travel
  Estate:        '#f59e0b',
  'Real Estate': '#d97706',
  Hospitality:   '#fb923c',
  Aviation:      '#60a5fa',
  // Commerce
  Restaurant:    '#ef4444',
  Retail:        '#f43f5e',
  'Auto Dealer': '#e11d48',
  Farm:          '#84cc16',
  // Other
  Education:     '#facc15',
  'Law Firm':    '#b45309',
  Media:         '#c084fc',
  'Non-Profit':  '#6ee7b7',
  Energy:        '#fde68a',
  Government:    '#1e40af',
  Space:         '#1e3a8a',
  Ports:         '#0369a1',
  Freight:       '#b45309',
  Fitness:         '#16a34a',
  'Grants & Loans': '#7c3aed',
  'Energy Tax':     '#f59e0b',
  'Skynet':         '#1e3a8a',
  Standalone:      '#2563eb',
  'RIL Tools':     '#8b5cf6',
  Marketing:       '#ec4899',
}

// ── Reusable components ────────────────────────────────────────────────────────
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
    danger:  { background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' },
    green:   { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

function Badge({ children, color = '#2563eb' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      background: color + '22', color, border: `1px solid ${color}44`,
      textTransform: 'uppercase'
    }}>{children}</span>
  )
}

function Card({ children, style = {}, glow, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18, ...style,
        ...(glow ? { boxShadow: `0 0 40px ${glow}33` } : {})
      }}
    >
      {children}
    </div>
  )
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
}

// ── QR Code Component ──────────────────────────────────────────────────────────
function QRImg({ value, size = 180 }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size, margin: 1,
      color: { dark: '#f1f5f9', light: '#0d0f17' }
    }).catch(() => {})
  }, [value, size])
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: 10, display: 'block' }}
    />
  )
}

// ── Logo Component ─────────────────────────────────────────────────────────────
function Logo({ height = 40 }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    fetch(LOGO_URL).then(r => r.text()).then(setSrc).catch(() => {})
  }, [])
  if (!src) return <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: height * 0.55, color: '#f59e0b', letterSpacing: -0.5 }}>RIL</span>
  return <img src={src} alt="Rip It Labs" style={{ height, objectFit: 'contain' }} />
}

// ── Wallet Hook ────────────────────────────────────────────────────────────────
const EMPTY_WALLET = { address: '', balance: '', rilBalance: '', connected: false, signature: '' }

function useWallet(contractAddress) {
  const [wallet, setWallet] = useState(EMPTY_WALLET)
  const [connecting, setConnecting] = useState(false)

  // Internal connect — throws on failure so callers can handle errors
  const _connect = useCallback(async (requestAccounts = true) => {
    if (!window.ethereum) throw new Error('No wallet detected. Install MetaMask or Coinbase Wallet.')
    const provider = new ethers.BrowserProvider(window.ethereum)

    if (requestAccounts) {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
    }

    // Switch to Base — add it if not yet in wallet
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN.hex }]
      })
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: BASE_CHAIN.hex, chainName: 'Base',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [BASE_CHAIN.rpc], blockExplorerUrls: ['https://basescan.org'] }]
        })
      }
      // code 4001 = user dismissed switch — continue anyway (they may be on Base already)
    }

    const signer = await provider.getSigner()
    const address = await signer.getAddress()

    // Request signature to prove wallet ownership (Web3 sign-in)
    let signature = ''
    try {
      const msg = `Welcome to RILBOT by Rip It Labs\nWallet: ${address}\nTimestamp: ${Date.now()}`
      signature = await signer.signMessage(msg)
    } catch { /* user declined signing — still allow connect */ }

    const ethBal = await provider.getBalance(address)
    const balance = parseFloat(ethers.formatEther(ethBal)).toFixed(4) + ' ETH'
    let rilBalance = '—'
    if (contractAddress && contractAddress !== 'PENDING_DEPLOYMENT') {
      try {
        const ril = new ethers.Contract(contractAddress, RIL_ABI, provider)
        const raw = await ril.balanceOf(address)
        rilBalance = Number(ethers.formatEther(raw)).toLocaleString() + ' RIL'
      } catch {}
    }

    setWallet({ address, balance, rilBalance, connected: true, signature })
    return address
  }, [contractAddress])

  // Auto-reconnect silently on mount
  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => { if (accounts[0]) _connect(false).catch(() => {}) })
      .catch(() => {})
  }, [_connect])

  // React to MetaMask account/chain changes
  useEffect(() => {
    if (!window.ethereum) return
    const onAccountsChanged = (accounts) => {
      if (accounts.length === 0) setWallet(EMPTY_WALLET)
      else _connect(false).catch(() => {})
    }
    const onChainChanged = () => window.location.reload()
    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [_connect])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      return await _connect(true)
    } finally {
      setConnecting(false)
    }
  }, [_connect])

  const disconnect = useCallback(async () => {
    setWallet(EMPTY_WALLET)
    // Revoke MetaMask permissions so next visit requires re-approval (MetaMask v11+)
    try {
      if (window.ethereum?.request) {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        })
      }
    } catch {} // Silently ignore if wallet doesn't support this
  }, [])

  return { wallet, setWallet, disconnect, connecting }
}

// ── Wallet Connect Modal ───────────────────────────────────────────────────────
function WalletModal({ open, onClose, onConnected }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeWallet, setActiveWallet] = useState('')   // 'metamask' | 'coinbase'
  const [hasEthereum, setHasEthereum] = useState(!!window.ethereum)
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

  // Re-check window.ethereum after a short delay — MetaMask injects asynchronously
  useEffect(() => {
    if (!open) return
    setStatus(''); setBusy(false); setActiveWallet('')
    // Check immediately
    setHasEthereum(!!window.ethereum)
    // Check again after 500ms in case extension injects late
    const t = setTimeout(() => setHasEthereum(!!window.ethereum), 500)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  // Core connect flow — works with any EIP-1193 provider
  const runConnect = async (rawProvider, walletLabel, alreadyBusy = false) => {
    if (!alreadyBusy) { setBusy(true); setActiveWallet(walletLabel) }
    setStatus('requesting')
    try {
      // 1. Request accounts
      const accounts = await rawProvider.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) {
        setStatus('error:No accounts returned. Unlock your wallet and try again.')
        setBusy(false); return
      }

      // 2. Switch / add Base network
      setStatus('switching')
      try {
        await rawProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN.hex }]
        })
      } catch (sw) {
        if (sw.code === 4902) {
          await rawProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: BASE_CHAIN.hex, chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [BASE_CHAIN.rpc], blockExplorerUrls: ['https://basescan.org'] }]
          })
        }
        // code 4001 = dismissed — carry on, wallet may already be on Base
      }

      // 3. Get signer + address
      setStatus('loading')
      const provider = new ethers.BrowserProvider(rawProvider)
      const signer   = await provider.getSigner()
      const address  = await signer.getAddress()

      // 4. Sign-in message (Web3 auth — optional, user can cancel)
      setStatus('signing')
      let signature = ''
      try {
        signature = await signer.signMessage(
          `Welcome to RILBOT by Rip It Labs\nWallet: ${address}\nTimestamp: ${Date.now()}`
        )
      } catch { /* user skipped signing */ }

      // 5. Fetch balances
      setStatus('loading')
      const ethBal = await provider.getBalance(address)
      const balance = parseFloat(ethers.formatEther(ethBal)).toFixed(4) + ' ETH'
      let rilBalance = '—'
      try {
        const ri = await fetch('/api/rilcoin').then(r => r.json())
        if (ri.contract_address && ri.contract_address !== 'PENDING_DEPLOYMENT') {
          const ril = new ethers.Contract(ri.contract_address, RIL_ABI, provider)
          const raw = await ril.balanceOf(address)
          rilBalance = Number(ethers.formatEther(raw)).toLocaleString() + ' RIL'
        }
      } catch {}

      onConnected({ address, balance, rilBalance, connected: true, signature, walletType: walletLabel, rawProvider })
      onClose()
    } catch (err) {
      const msg = (err?.code === 4001 || err?.code === -32603)
        ? `error:Request cancelled — please approve in ${walletLabel}.`
        : `error:${err?.message?.slice(0, 120) || 'Connection failed.'}`
      setStatus(msg)
      setBusy(false)
      setActiveWallet('')
    }
  }

  const connectMetaMask = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (busy) return
    // Re-check at click time — MetaMask may have injected after render
    const eth = window.ethereum
      || window.ethereum?.providers?.find(p => p.isMetaMask)
      || null
    if (!eth) {
      if (isMobile) {
        // Deep link opens RILBOT inside MetaMask's in-app browser
        window.open('https://metamask.app.link/dapp/rilbot.ripitlabs.com', '_blank')
      } else {
        // Open install page in new tab; show hint to refresh after installing
        window.open('https://metamask.io/download/', '_blank')
        setStatus('install_metamask')
      }
      return
    }
    setHasEthereum(true)
    runConnect(eth, 'MetaMask')
  }

  const connectCoinbase = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (busy) return
    try {
      const cbProvider = makeCBProvider()
      runConnect(cbProvider, 'Coinbase Wallet')
    } catch (err) {
      setStatus(`error:${err?.message?.slice(0, 120) || 'Coinbase Wallet failed to initialize.'}`)
    }
  }

  const connectWalletConnect = async (e) => {
    e.preventDefault(); e.stopPropagation()
    if (busy) return
    setBusy(true)
    setActiveWallet('WalletConnect')
    setStatus('requesting')
    try {
      const wcProvider = await makeWCProvider()
      // WalletConnect shows its own QR code modal automatically
      await wcProvider.connect()
      await runConnect(wcProvider, 'WalletConnect', true)
    } catch (err) {
      const msg = err?.message?.includes('User rejected') || err?.message?.includes('closed')
        ? 'error:Connection cancelled — please scan the QR code and approve in your wallet.'
        : `error:${err?.message?.slice(0, 120) || 'WalletConnect failed.'}`
      setStatus(msg)
      setBusy(false)
      setActiveWallet('')
    }
  }

  const STATUSES = {
    requesting:      { text: `Check your wallet — approve the connection request…`, icon: '⏳', color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    switching:       { text: 'Switching to Base network…', icon: '⛓', color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    loading:         { text: 'Loading wallet data…', icon: '⏳', color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    signing:         { text: 'Sign the welcome message to verify ownership (optional)…', icon: '✍️', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
    no_metamask:     { text: 'MetaMask not detected. Install the extension or use Coinbase Wallet below.', icon: '⚠️', color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    install_metamask:{ text: 'MetaMask install page opened in a new tab. After installing, refresh this page and try again.', icon: '🦊', color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  }
  const errMsg = status.startsWith('error:') ? status.slice(6) : null
  const sInfo  = STATUSES[status]

  const WalletBtn = ({ onClick, icon, label, sublabel, accentColor, isActive }) => (
    <button onClick={onClick} disabled={busy && !isActive} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', borderRadius: 14, border: `2px solid ${isActive ? accentColor : 'rgba(255,255,255,0.09)'}`,
      background: isActive ? accentColor + '18' : 'rgba(255,255,255,0.04)',
      cursor: (busy && !isActive) ? 'not-allowed' : 'pointer', opacity: (busy && !isActive) ? 0.4 : 1,
      transition: 'all 0.15s', textAlign: 'left', marginBottom: 10,
    }}
      onMouseEnter={e => { if (!busy || isActive) { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.background = accentColor + '12' } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' } }}
    >
      <span style={{ fontSize: 30, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: isActive ? accentColor : '#f1f5f9' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sublabel}</div>
      </div>
      {isActive && busy && <Spinner />}
      {!busy && <span style={{ fontSize: 12, fontWeight: 700, color: accentColor, background: accentColor + '18', padding: '4px 10px', borderRadius: 20 }}>Connect →</span>}
    </button>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, width: '100%', maxWidth: 460, padding: 32, position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Connect Wallet</h2>
          {!busy && <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', width: 34, height: 34, cursor: 'pointer', fontSize: 18 }}>×</button>}
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Base network · Pay with RILCOIN, ETH, or Credit Card · ISO 20022 on every payment</p>

        {/* Status / error banner */}
        {(sInfo || errMsg) && (
          <div style={{ background: errMsg ? 'rgba(239,68,68,0.1)' : sInfo.bg, border: `1px solid ${errMsg ? 'rgba(239,68,68,0.3)' : sInfo.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: errMsg ? '#fca5a5' : sInfo.color, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>{errMsg ? '⚠️' : sInfo.icon}</span>
            <span>{errMsg || sInfo.text}</span>
          </div>
        )}

        {/* Wallet options */}
        <WalletBtn
          onClick={connectMetaMask}
          icon="🦊"
          label="MetaMask"
          sublabel={hasEthereum ? 'Browser extension detected — click to connect' : (isMobile ? 'Tap to open in MetaMask mobile app →' : 'Click to install MetaMask, then refresh →')}
          accentColor="#f59e0b"
          isActive={activeWallet === 'MetaMask'}
        />
        <WalletBtn
          onClick={connectCoinbase}
          icon="🔵"
          label="Coinbase Wallet"
          sublabel="Smart Wallet · no extension needed · QR code on desktop"
          accentColor="#2563eb"
          isActive={activeWallet === 'Coinbase Wallet'}
        />
        <WalletBtn
          onClick={connectWalletConnect}
          icon="🔗"
          label="Any Web3 Wallet"
          sublabel="Rainbow · Trust · Uniswap · Argent · Zerion · 300+ wallets via QR"
          accentColor="#8b5cf6"
          isActive={activeWallet === 'WalletConnect'}
        />

        {/* QR — pay directly */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>OR SCAN TO PAY DIRECTLY FROM ANY MOBILE WALLET</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: 8, background: '#0d0f17', borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)', flexShrink: 0 }}>
              <QRImg value={`ethereum:${TREASURY}`} size={110} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Rip It Labs Treasury</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#f59e0b', wordBreak: 'break-all' }}>{TREASURY}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Network: Base · Send RIL or ETH</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function Nav({ wallet, onConnect, onDisconnect, onNav, page }) {
  const [scroll, setScroll] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScroll(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close drawer on nav
  const go = (p) => { onNav(p); setMenuOpen(false) }

  const NavBtn = ({ label, p, emoji }) => (
    <button onClick={() => onNav(p)} style={{
      background: page === p ? 'rgba(255,255,255,0.09)' : 'none', border: 'none', borderRadius: 8,
      color: page === p ? '#f1f5f9' : '#94a3b8', padding: '8px 13px', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', transition: 'color 0.15s, background 0.15s', whiteSpace: 'nowrap',
    }}>{emoji && <span style={{ marginRight: 5 }}>{emoji}</span>}{label}</button>
  )

  const WalletPill = ({ compact }) => wallet.connected ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: compact ? '5px 10px' : '6px 12px', flexShrink: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
      {!compact && wallet.rilBalance !== '—' && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>{wallet.rilBalance}</span>}
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{wallet.address.slice(0,6)}…{wallet.address.slice(-4)}</span>
      <button onClick={onDisconnect} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#f87171', fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 'unset' }}>✕</button>
    </div>
  ) : (
    <button onClick={onConnect} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>🔗 Connect</button>
  )

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
      <nav style={{
        padding: '0 20px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        background: scroll ? 'rgba(7,8,12,0.98)' : 'rgba(7,8,12,0.9)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        transition: 'background 0.3s',
      }}>

        {/* Logo */}
        <button onClick={() => go('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, minHeight: 'unset' }}>
          <Logo height={32} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: 16, color: '#f1f5f9', letterSpacing: -0.5 }}>RILBOT</div>
            <div style={{ fontSize: 8, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>Rip It Labs</div>
          </div>
        </button>

        {/* Desktop nav links */}
        <div className="nav-links">
          <NavBtn label="Agents" p="agents" />
          <NavBtn label="How It Works" p="how" />
          <NavBtn label="Tokenomics" p="tokenomics" />
          <a href="/portfolio" style={{ background: page === 'projects' ? 'rgba(255,255,255,0.09)' : 'none', borderRadius: 8, color: page === 'projects' ? '#f1f5f9' : '#94a3b8', padding: '8px 13px', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>My Projects</a>
          <NavBtn label="Build Agent" p="builder" emoji="🔨" />
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <a href="https://whitepaper.ripitlabs.com" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#a5b4fc', textDecoration: 'none', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', whiteSpace: 'nowrap' }}>Whitepaper</a>
          <button onClick={() => onNav('investors')} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#34d399', background: page === 'investors' ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Investors</button>
          <button onClick={() => onNav('pilot')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: page === 'pilot' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: page === 'pilot' ? '#000' : '#f59e0b', whiteSpace: 'nowrap' }}>Free Pilot</button>
        </div>

        {/* Right: wallet + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <WalletPill compact={false} />
          {/* Hamburger — shown via CSS on mobile */}
          <button className="nav-hamburger" onClick={() => setMenuOpen(m => !m)} aria-label="Menu" style={{ minHeight: 'unset' }}>
            {menuOpen
              ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
              : <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nav-drawer${menuOpen ? ' open' : ''}`}>
        <button onClick={() => go('agents')}>🤖 Browse Agents</button>
        <button onClick={() => go('how')}>💡 How It Works</button>
        <button onClick={() => go('tokenomics')}>📊 Tokenomics</button>
        <a href="/portfolio" onClick={() => setMenuOpen(false)}>📁 My Projects</a>
        <button onClick={() => go('builder')}>🔨 Build an Agent</button>
        <button onClick={() => go('pilot')}>🚀 Free Pilot</button>
        <div className="drawer-divider" />
        <a href="https://whitepaper.ripitlabs.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>📄 Whitepaper</a>
        <button onClick={() => { go('investors') }}>💼 Investors</button>
        <a href="https://rilbot.ripitlabs.com/portfolio" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>🏗️ App Portfolio</a>
        <div className="drawer-divider" />
        {/* Wallet in drawer */}
        {wallet.connected ? (
          <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, margin: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8' }}>{wallet.address.slice(0,10)}…{wallet.address.slice(-6)}</span>
            </div>
            {wallet.rilBalance !== '—' && <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>{wallet.rilBalance}</div>}
            <button onClick={() => { onDisconnect(); setMenuOpen(false) }} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 700, padding: '8px 16px', cursor: 'pointer', width: '100%', minHeight: 'unset' }}>Disconnect Wallet</button>
          </div>
        ) : (
          <button onClick={() => { onConnect(); setMenuOpen(false) }} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', fontWeight: 800, fontSize: 15, borderRadius: 10, border: 'none', cursor: 'pointer', padding: '13px 16px' }}>🔗 Connect Wallet</button>
        )}
      </div>
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────────
function Hero({ onNav, rilcoin, onConnect, wallet }) {
  const contract = rilcoin?.contract_address
  const isPending = !contract || contract === 'PENDING_DEPLOYMENT'

  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(90px,12vw,120px) clamp(16px,5vw,48px) clamp(48px,8vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.18) 0%, transparent 65%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: 'auto, 40px 40px, 40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '12%', left: '5%', width: 'clamp(150px,30vw,320px)', height: 'clamp(150px,30vw,320px)', background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 'clamp(120px,25vw,260px)', height: 'clamp(120px,25vw,260px)', background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 940, width: '100%' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 40, padding: '5px 16px', marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#f59e0b', fontWeight: 600, letterSpacing: 0.5 }}>FIRST TRUE AI UTILITY TOKEN ECOSYSTEM</span>
          <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '2px 10px' }}>🏦 ISO 20022</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(38px, 7vw, 82px)', fontWeight: 900, letterSpacing: -2, marginBottom: 22, lineHeight: 1.06 }}>
          Hire AI Agents.<br />
          <span className="grad">Pay with RILCOIN or Credit Card.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2.2vw, 20px)', color: '#94a3b8', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.65 }}>
          The world's first AI agent marketplace powered by a utility token. 652 specialists across logistics, wealth, legal, HR, engineering, and more — pay with <strong style={{ color: '#f59e0b' }}>RILCOIN</strong> or <strong style={{ color: '#10b981' }}>credit card</strong>. Every payment generates an ISO 20022 blockchain record.
        </p>

        {/* CTAs */}
        <div className="hero-ctas" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48, maxWidth: 520, margin: '0 auto 48px' }}>
          <Btn onClick={() => onNav('agents')} variant="gold" size="lg" style={{ flex: 1, minWidth: 180, justifyContent: 'center' }}>
            🤖 Browse Agents
          </Btn>
          {wallet.connected ? (
            <Btn onClick={() => onNav('agents')} variant="green" size="lg" style={{ flex: 1, minWidth: 180, justifyContent: 'center' }}>
              ✅ Wallet Connected
            </Btn>
          ) : (
            <Btn onClick={onConnect} variant="primary" size="lg" style={{ flex: 1, minWidth: 180, justifyContent: 'center' }}>
              🔗 Connect Wallet
            </Btn>
          )}
        </div>

        {/* Stats bar */}
        <div className="stats-bar" style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { label: 'AI Specialists', value: '652+', icon: '🤖' },
            { label: 'Industries', value: '35+', icon: '🏢' },
            { label: 'Token Supply', value: '1B RIL', icon: '🪙' },
            { label: 'Network', value: 'Base', icon: '⛓' },
          ].map(({ label, value, icon }, i) => (
            <div key={i} style={{ flex: 1, padding: 'clamp(16px,3vw,24px) clamp(10px,2vw,16px)', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Space Grotesk'" }}>{value}</div>
              <div style={{ fontSize: 'clamp(9px,1.5vw,12px)', color: '#64748b', marginTop: 3, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Contract links */}
        {!isPending && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <code style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 6 }}>{contract.slice(0,10)}…{contract.slice(-6)}</code>
            <a href={`https://basescan.org/token/${contract}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6' }}>Basescan ↗</a>
            <a href="https://dexscreener.com/base/0xafaa5753e29d14712b2a6f6cb4e26d2ca4aeba36" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#10b981' }}>DEX Screener ↗</a>
          </div>
        )}
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', icon: '🌐', title: 'Visit RILBOT', desc: 'No account required. No crypto needed. Open RILBOT on any device — desktop, tablet, or phone. You\'re 5 steps away from 652 AI specialists.', color: '#f59e0b' },
    { n: '02', icon: '🤖', title: 'Browse 652 AI Agents', desc: 'Search by name or filter by category — Legal, Wealth, Logistics, HR, Engineering, Medical, Insurance, Farming, and more. Every specialist is ready now.', color: '#8b5cf6' },
    { n: '03', icon: '📋', title: 'Describe Your Project', desc: 'Tell your agent exactly what you need. Add context, documents, or goals. Choose Basic, Standard, or Enterprise tier based on your complexity.', color: '#3b82f6' },
    { n: '04', icon: '💳', title: 'Select Credit Card', desc: 'At checkout, tap 💳 Credit Card. Visa, Mastercard, and Amex are all accepted. You\'ll be taken to Stripe\'s secure checkout — the same platform used by Amazon and Apple.', color: '#10b981' },
    { n: '05', icon: '🔒', title: 'Stripe Secure Checkout', desc: 'Enter your card details on Stripe\'s encrypted page. Payment processes in seconds. An ISO 20022 blockchain receipt is generated automatically for every transaction.', color: '#10b981' },
    { n: '06', icon: '🎯', title: 'AI Delivers Results', desc: 'Your specialist agent gets to work immediately. Receive professional analysis, strategic plans, legal opinions, financial models — powered by Rip It Labs AI.', color: '#ef4444' },
  ]

  return (
    <section id="how" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <Badge color="#8b5cf6">HOW IT WORKS</Badge>
        <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, marginTop: 16, letterSpacing: -1 }}>Pay with any card —<br /><span className="grad">AI in six steps</span></h2>
        <p style={{ color: '#64748b', marginTop: 12, fontSize: 16 }}>No crypto wallet required. Visa · Mastercard · Amex accepted via Stripe.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {steps.map(({ n, icon, title, desc, color }) => (
          <Card key={n} style={{ padding: 32, position: 'relative', overflow: 'hidden' }} glow={color}>
            <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 64, fontWeight: 900, color: color + '10', fontFamily: "'Space Grotesk'", lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 40, marginBottom: 20 }}>
              {icon === null
                ? <img src="/static/rilcoin-coin.png" alt="RILCOIN" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                : icon}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#f1f5f9' }}>{title}</h3>
            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7 }}>{desc}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── Agent Marketplace ──────────────────────────────────────────────────────────
function AgentMarketplace({ wallet, onSubmit }) {
  const [agents, setAgents] = useState([])
  const [filter, setFilter] = useState('All')
  const [teams, setTeams] = useState(['All'])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [tier, setTier] = useState('standard')

  useEffect(() => {
    fetch(`${API}/agents`).then(r => r.json()).then(setAgents)
    fetch(`${API}/teams`).then(r => r.json()).then(setTeams)
  }, [])

  const filtered = agents
    .filter(a => filter === 'All' || a.team === filter)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tagline?.toLowerCase().includes(search.toLowerCase()) || a.team.toLowerCase().includes(search.toLowerCase()))

  // Group teams into categories for cleaner display
  const teamGroups = [
    { label: 'All', teams: ['All'] },
    { label: '🗄️ Data Team', teams: ['Data Team'] },
    { label: '⚖️ Legal Team', teams: ['Legal Team', 'Contract Law', 'IP Business', 'Law Firm'] },
    { label: '🧠 SoulCoach', teams: ['SoulCoach'] },
    { label: '✊ Union Team', teams: ['Union Team'] },
    { label: '🌐 Foreign Affairs', teams: ['Foreign Affairs'] },
    { label: '🆘 Survival & Emergency', teams: ['Survival & Emergency'] },
    { label: '🌾 Food & Agriculture', teams: ['Food & Agriculture'] },
    { label: '⚡ Energy Transition', teams: ['Energy Transition'] },
    { label: '🏥 Public Health', teams: ['Public Health'] },
    { label: '🧬 Biotech & Open Science', teams: ['Biotech & Open Science'] },
    { label: '🏛️ Civics & Democracy', teams: ['Civics & Democracy'] },
    { label: '💻 Digital Literacy', teams: ['Digital Literacy & Privacy'] },
    { label: '🌊 Ocean & Water', teams: ['Ocean & Water'] },
    { label: '🧒 Youth & Next Gen', teams: ['Youth & Next Gen'] },
    { label: '📣 Marketing', teams: ['Marketing'] },
    { label: 'Business', teams: ['Corporate', 'HR', 'Temp Agency'] },
    { label: 'Finance', teams: ['Wealth', 'Banking', 'Insurance', 'Benefits'] },
    { label: 'Operations', teams: ['Logistics', 'Infrastructure', 'Manufacturing', 'Construction', 'Engineering'] },
    { label: 'Technology', teams: ['Software Dev', 'Cybersecurity'] },
    { label: 'Healthcare', teams: ['Healthcare', 'Dental', 'Wellness', 'Pharma', 'Veterinary'] },
    { label: 'Property', teams: ['Estate', 'Real Estate', 'Hospitality', 'Aviation'] },
    { label: 'Commerce', teams: ['Restaurant', 'Retail', 'Auto Dealer', 'Farm'] },
    { label: 'Other', teams: ['Education', 'Media', 'Non-Profit', 'Energy', 'Standalone'] },
    { label: 'Public Sector', teams: ['Government', 'Space'] },
    { label: 'Transport', teams: ['Ports', 'Freight'] },
    { label: 'Health & Fitness', teams: ['Fitness'] },
    { label: 'Funding', teams: ['Grants & Loans', 'Energy Tax'] },
    { label: 'Defence', teams: ['Skynet'] },
  ]

  return (
    <section id="agents" style={{ padding: '100px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <Badge color="#3b82f6">AI AGENT MARKETPLACE</Badge>
        <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, marginTop: 16, letterSpacing: -1 }}>
          652 AI specialists,<br /><span className="grad">on demand</span>
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 17, marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}>
          Every project priced in RILCOIN. Every specialist powered by Rip It Labs AI.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ maxWidth: 480, margin: '0 auto 32px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#64748b' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents by name, skill, or industry…"
          style={{
            width: '100%', padding: '14px 16px 14px 44px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, color: '#f1f5f9', fontSize: 15, outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>×</button>
        )}
      </div>

      {/* Filter tabs — grouped */}
      <div style={{ marginBottom: 40 }}>
        {teamGroups.map(group => {
          const availableTeams = group.teams.filter(t => t === 'All' || teams.includes(t))
          if (availableTeams.length === 0) return null
          return (
            <div key={group.label} style={{ marginBottom: 12 }}>
              {group.label !== 'All' && (
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{group.label}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableTeams.map(t => (
                  <button key={t} onClick={() => { setFilter(t); setSearch('') }} style={{
                    padding: '8px 18px', borderRadius: 40, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.2s', border: 'none', whiteSpace: 'nowrap',
                    background: filter === t ? (C[t] || '#2563eb') : 'rgba(255,255,255,0.05)',
                    color: filter === t ? '#fff' : '#94a3b8',
                    boxShadow: filter === t ? `0 4px 16px ${(C[t] || '#2563eb')}44` : 'none',
                    transform: filter === t ? 'scale(1.05)' : 'scale(1)',
                  }}>{t}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Results count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: '#64748b' }}>
          {search ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"` : `${filtered.length} agent${filtered.length !== 1 ? 's' : ''} in ${filter}`}
        </span>
        {(search || filter !== 'All') && (
          <button onClick={() => { setFilter('All'); setSearch('') }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            Clear filters ×
          </button>
        )}
      </div>

      {/* Agent grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No agents found</h3>
          <p style={{ color: '#64748b' }}>Try a different search term or category</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} onSelect={() => { setSelected(agent); setTier('standard') }} />
          ))}
        </div>
      )}

      {/* Agent detail modal */}
      {selected && (
        <AgentModal agent={selected} tier={tier} setTier={setTier} wallet={wallet} onClose={() => setSelected(null)} onSubmit={onSubmit} />
      )}
    </section>
  )
}

function AgentCard({ agent, onSelect }) {
  const color = C[agent.team] || '#2563eb'
  const [hovered, setHovered] = useState(false)
  const isTool = agent.tool && agent.external_url
  const handleClick = isTool
    ? () => window.open(agent.external_url, '_blank', 'noopener')
    : onSelect
  return (
    <Card
      style={{
        padding: 24, cursor: 'pointer', transition: 'all 0.22s', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'none',
        borderColor: hovered ? color + '50' : 'rgba(255,255,255,0.08)',
      }}
      glow={hovered ? color : undefined}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32, lineHeight: 1, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '18', borderRadius: 12 }}>
            {agent.emoji}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>{agent.name}</h3>
            <span style={{
              display: 'inline-block', marginTop: 3, padding: '2px 8px', borderRadius: 20,
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              background: color + '22', color, border: `1px solid ${color}44`
            }}>{agent.team}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: color, fontWeight: 600, marginBottom: 8, margin: '0 0 8px' }}>{agent.tagline}</p>
      <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: '0 0 16px' }}>{agent.description}</p>

      {/* Capabilities preview */}
      {agent.capabilities?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
          {agent.capabilities.slice(0, 3).map(c => (
            <span key={c} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#64748b' }}>{c}</span>
          ))}
          {agent.capabilities.length > 3 && (
            <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#64748b' }}>+{agent.capabilities.length - 3} more</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
        <div>
          {isTool ? (
            <>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 1 }}>ACCESS</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>FREE</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 1 }}>FROM</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontFamily: "'Space Grotesk'", lineHeight: 1 }}>
                {agent.ril_price.basic} <span style={{ fontSize: 12, fontWeight: 600 }}>RIL</span>
              </div>
            </>
          )}
        </div>
        <div style={{
          background: color + '20', border: `1px solid ${color}40`, color,
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
          transition: 'all 0.2s',
          ...(hovered ? { background: color, color: '#fff' } : {})
        }}>
          {isTool ? 'Open ↗' : 'Hire →'}
        </div>
      </div>
    </Card>
  )
}

function AgentModal({ agent, tier, setTier, wallet, onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('ril')
  const [submitting, setSubmitting] = useState(false)
  const [projectId, setProjectId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)   // null | 'processing' | 'completed' | 'failed'
  const [result, setResult] = useState('')
  const pollRef = useRef(null)

  const price = agent.ril_price[tier]
  const ethPrice = (price / RIL_PER_ETH).toFixed(5)
  const usdPrice = Math.max(4.99, price * RIL_TO_USD).toFixed(2)
  const color = C[agent.team] || '#2563eb'

  // Poll project status after payment
  useEffect(() => {
    if (!projectId) return
    setJobStatus('processing')
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetch(`${API}/projects/${projectId}`).then(r => r.json())
        if (data.status === 'completed') {
          clearInterval(pollRef.current)
          setJobStatus('completed')
          setResult(data.result || '')
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current)
          setJobStatus('failed')
          setResult(data.result || 'Agent encountered an error.')
        }
      } catch {}
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [projectId])

  const handleSubmit = async () => {
    if (paymentMethod === 'card') {
      // Card: create Stripe session then redirect
      setSubmitting(true)
      try {
        const res = await fetch(`${API}/stripe/create-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.id, tier, title, description, wallet_address: 'card-payment' }),
        }).then(r => r.json())
        if (res.checkout_url) {
          window.location.href = res.checkout_url
        } else {
          alert(res.detail || 'Stripe not configured yet.')
          setSubmitting(false)
        }
      } catch {
        alert('Failed to start checkout. Please try again.')
        setSubmitting(false)
      }
      return
    }
    setSubmitting(true)
    try {
      const res = await onSubmit({ agentId: agent.id, tier, title, description, price, paymentMethod, ethPrice })
      if (res?.projectId) setProjectId(res.projectId)
    } finally {
      setSubmitting(false)
    }
  }

  const tiers = [
    { key: 'basic', label: 'Basic', desc: 'Quick analysis, key recommendations' },
    { key: 'standard', label: 'Standard', desc: 'Full analysis with detailed report' },
    { key: 'enterprise', label: 'Enterprise', desc: 'Comprehensive strategy + follow-up' },
  ]

  // ── Result / Processing view ────────────────────────────────────────────────
  if (jobStatus) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{agent.icon}</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9' }}>{agent.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: jobStatus === 'completed' ? 'rgba(16,185,129,0.15)' : jobStatus === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: jobStatus === 'completed' ? '#34d399' : jobStatus === 'failed' ? '#f87171' : '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {jobStatus === 'completed' ? '✓ Done' : jobStatus === 'failed' ? '✕ Failed' : '⏳ Working…'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', width: 34, height: 34, cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {jobStatus === 'processing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 52, height: 52, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>{agent.name} is working on your project…</div>
              <div style={{ color: '#64748b', fontSize: 14 }}>This typically takes 15–60 seconds. Results appear here automatically.</div>
              <div style={{ marginTop: 20, fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>Project ID: {projectId?.slice(0,16)}…</div>
            </div>
          )}
          {(jobStatus === 'completed' || jobStatus === 'failed') && (
            <div>
              {jobStatus === 'failed' && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 13 }}>
                  ⚠️ The agent encountered an error. Your payment was received — please contact support with project ID: {projectId?.slice(0,16)}
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>{result}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {jobStatus === 'completed' && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => { navigator.clipboard?.writeText(result) }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📋 Copy</button>
            <button onClick={onClose} style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', padding: 40 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{agent.emoji}</div>
            <h2 style={{ fontSize: 26, fontWeight: 800 }}>{agent.name}</h2>
            <p style={{ color: color, fontWeight: 600, marginTop: 4 }}>{agent.tagline}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', width: 36, height: 36, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 28 }}>{agent.description}</p>

        {/* Capabilities */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>CAPABILITIES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {agent.capabilities.map(c => (
              <span key={c} style={{ background: color + '15', border: `1px solid ${color}30`, borderRadius: 20, padding: '5px 14px', fontSize: 13, color }}>✓ {c}</span>
            ))}
          </div>
        </div>

        {/* Tier selector */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>SELECT TIER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {tiers.map(({ key, label, desc }) => (
              <button key={key} onClick={() => setTier(key)} style={{
                padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                background: tier === key ? color + '20' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${tier === key ? color : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: tier === key ? '#f1f5f9' : '#94a3b8', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', fontFamily: "'Space Grotesk'", marginBottom: 4 }}>{agent.ril_price[key]} <span style={{ fontSize: 12 }}>RIL</span></div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Project form */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>YOUR PROJECT</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Project title"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 15, marginBottom: 12 }}
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`Describe what you need from the ${agent.name}...`}
            rows={5}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 15, resize: 'vertical' }}
          />
        </div>

        {/* Payment method selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>PAYMENT METHOD</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <button onClick={() => setPaymentMethod('ril')} style={{
              padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: paymentMethod === 'ril' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${paymentMethod === 'ril' ? '#f59e0b' : 'rgba(255,255,255,0.07)'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'ril' ? '#f59e0b' : '#94a3b8' }}>🪙 RILCOIN</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b', marginTop: 4 }}>{price} <span style={{ fontSize: 10 }}>RIL</span></div>
            </button>
            <button onClick={() => setPaymentMethod('eth')} style={{
              padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: paymentMethod === 'eth' ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${paymentMethod === 'eth' ? '#60a5fa' : 'rgba(255,255,255,0.07)'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'eth' ? '#60a5fa' : '#94a3b8' }}>⟠ ETH</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#60a5fa', marginTop: 4 }}>{ethPrice} <span style={{ fontSize: 10 }}>ETH</span></div>
            </button>
            <button onClick={() => setPaymentMethod('card')} style={{
              padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: paymentMethod === 'card' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${paymentMethod === 'card' ? '#10b981' : 'rgba(255,255,255,0.07)'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'card' ? '#10b981' : '#94a3b8' }}>💳 Credit Card</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', marginTop: 4 }}>${usdPrice} <span style={{ fontSize: 10 }}>USD</span></div>
            </button>
          </div>
        </div>

        {/* Payment summary */}
        <div style={{
          background: paymentMethod === 'card' ? 'rgba(16,185,129,0.06)' : paymentMethod === 'ril' ? 'rgba(245,158,11,0.06)' : 'rgba(96,165,250,0.06)',
          border: `1px solid ${paymentMethod === 'card' ? 'rgba(16,185,129,0.2)' : paymentMethod === 'ril' ? 'rgba(245,158,11,0.2)' : 'rgba(96,165,250,0.2)'}`,
          borderRadius: 12, padding: 20, marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Total Payment</div>
              {paymentMethod === 'ril' && <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b', fontFamily: "'Space Grotesk'" }}>{price} <span style={{ fontSize: 14 }}>RIL</span></div>}
              {paymentMethod === 'eth' && <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa', fontFamily: "'Space Grotesk'" }}>{ethPrice} <span style={{ fontSize: 14 }}>ETH</span></div>}
              {paymentMethod === 'card' && <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', fontFamily: "'Space Grotesk'" }}>${usdPrice} <span style={{ fontSize: 14 }}>USD</span></div>}
              {paymentMethod !== 'card' && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>To: {TREASURY.slice(0,8)}…{TREASURY.slice(-6)}</div>}
              {paymentMethod === 'card' && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Secure checkout via Stripe</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{paymentMethod === 'card' ? 'Any card accepted' : 'Network: Base'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{paymentMethod === 'card' ? 'Visa · MC · Amex' : 'Gas: ~$0.001'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Turnaround: {agent.turnaround}</div>
            </div>
          </div>
        </div>

        {/* Submit */}
        {paymentMethod === 'card' ? (
          <Btn
            onClick={handleSubmit}
            variant="green" size="lg"
            disabled={!title || !description || submitting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? <><Spinner /> Opening Stripe checkout…</> : <>💳 Pay ${usdPrice} with Card →</>}
          </Btn>
        ) : !wallet.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-wallet-modal'))} style={{ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', fontWeight: 800, fontSize: 18, padding: '16px 36px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              🔗 Connect Wallet to Hire
            </button>
            {/* QR fallback for mobile */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>OR SCAN TO PAY FROM MOBILE WALLET</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ padding: 8, background: '#0d0f17', borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)', flexShrink: 0 }}>
                  <QRImg value={`ethereum:${TREASURY}`} size={110} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Rip It Labs Treasury</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#f59e0b', wordBreak: 'break-all' }}>{TREASURY}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Network: Base · Send RIL or ETH</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Btn
            onClick={handleSubmit}
            variant={paymentMethod === 'eth' ? 'primary' : 'gold'} size="lg"
            disabled={!title || !description || submitting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting
              ? <><Spinner /> Processing payment…</>
              : <>🚀 Submit — Pay {paymentMethod === 'ril' ? `${price} RIL` : `${ethPrice} ETH`}</>
            }
          </Btn>
        )}
      </div>
    </div>
  )
}

// ── Tokenomics ─────────────────────────────────────────────────────────────────
function Tokenomics({ rilcoin }) {
  const allocs = [
    { label: 'Treasury / Platform', pct: 40, amount: '400,000,000', color: '#2563eb', use: 'Platform ops, agent rewards, ecosystem growth' },
    { label: 'Public / Liquidity', pct: 30, amount: '300,000,000', color: '#f59e0b', use: 'DEX liquidity pools + exchange listings' },
    { label: 'Team', pct: 20, amount: '200,000,000', color: '#10b981', use: '4-year linear vesting, 1-year cliff' },
    { label: 'Advisors / Partners', pct: 10, amount: '100,000,000', color: '#ef4444', use: 'Strategic advisors and partners' },
  ]

  return (
    <section id="tokenomics" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <Badge color="#f59e0b">TOKENOMICS</Badge>
        <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, marginTop: 16, letterSpacing: -1 }}>
          Built for utility.<br /><span className="grad-gold">Designed for value.</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {/* Left — info */}
        <div>
          <Card style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>TOKEN DETAILS</div>
            {[
              { label: 'Name', value: 'RILCOIN' },
              { label: 'Symbol', value: 'RIL' },
              { label: 'Network', value: 'Base (Coinbase L2)' },
              { label: 'Total Supply', value: '1,000,000,000' },
              { label: 'Supply Type', value: 'Fixed — No Minting' },
              { label: 'Decimals', value: '18' },
              { label: 'Standard', value: 'ERC-20' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>{label}</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{value}</span>
              </div>
            ))}
          </Card>

          {/* Buy CTA */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 18, padding: 28, textAlign: 'center' }}>
            <img src="/static/rilcoin-coin.png" alt="RILCOIN" style={{ width: 56, height: 56, marginBottom: 12, borderRadius: '50%' }} />
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Buy RILCOIN</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Available on Coinbase — the most trusted crypto exchange in the US</p>
            <Btn onClick={() => window.open('https://coinbase.com', '_blank')} variant="gold" size="md" style={{ width: '100%', justifyContent: 'center' }}>
              Buy RIL on Coinbase →
            </Btn>
          </div>
        </div>

        {/* Right — allocations */}
        <div>
          <Card style={{ padding: 32 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>SUPPLY ALLOCATION</div>

            {/* Visual bar */}
            <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 32, gap: 2 }}>
              {allocs.map(({ pct, color }) => (
                <div key={color} style={{ flex: pct, background: color, transition: 'flex 0.5s', borderRadius: 2 }} />
              ))}
            </div>

            {allocs.map(({ label, pct, amount, color, use }) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Space Grotesk'" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', paddingLeft: 22, marginBottom: 2 }}>{amount} RIL</div>
                <div style={{ fontSize: 12, color: '#475569', paddingLeft: 22 }}>{use}</div>
                {/* Progress bar */}
                <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginLeft: 22 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </Card>

          <Card style={{ padding: 24, marginTop: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>UTILITY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🤖', text: 'Pay for AI agent services on RILBOT' },
                { icon: '🔥', text: 'Tokens burned with every completed project' },
                { icon: '🏆', text: 'Hold RIL for platform discounts and priority access' },
                { icon: '💰', text: 'Treasury rewards ecosystem contributors' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#94a3b8' }}>
                  <span>{icon}</span>{text}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

// ── My Projects ────────────────────────────────────────────────────────────────
function ResultModal({ project, onClose }) {
  if (!project) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{project.title}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{project.agent_name} · {project.tier} tier</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', borderRadius: 8, width: 36, height: 36 }}>×</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.7, color: '#e2e8f0', margin: 0 }}>{project.result}</pre>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12 }}>
          {project.tx_hash && <a href={`https://basescan.org/tx/${project.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3b82f6' }}>View tx ↗</a>}
          <button onClick={() => navigator.clipboard?.writeText(project.result)} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Copy Result</button>
        </div>
      </div>
    </div>
  )
}

function MyProjects({ wallet }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const fetchProjects = () => {
    if (!wallet.connected) return
    fetch(`${API}/projects?wallet=${wallet.address}`)
      .then(r => r.json())
      .then(p => { setProjects(p); setLoading(false) })
  }

  useEffect(() => {
    if (!wallet.connected) return
    setLoading(true)
    fetchProjects()
  }, [wallet])

  // Auto-poll every 5s if any job is processing
  useEffect(() => {
    const hasActive = projects.some(p => p.status === 'processing' || p.status === 'payment_received')
    if (!hasActive) return
    const timer = setInterval(fetchProjects, 5000)
    return () => clearInterval(timer)
  }, [projects])

  const STATUS_COLOR = { pending_payment: '#f59e0b', payment_received: '#3b82f6', processing: '#8b5cf6', completed: '#10b981', failed: '#ef4444' }

  if (!wallet.connected) return (
    <section style={{ padding: '120px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
      <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Connect Your Wallet</h2>
      <p style={{ color: '#64748b' }}>Connect your wallet to view your project history</p>
    </section>
  )

  return (
    <section id="projects" style={{ padding: '100px 24px', maxWidth: 900, margin: '0 auto' }}>
      <ResultModal project={selected} onClose={() => setSelected(null)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800 }}>My Projects</h2>
        <button onClick={fetchProjects} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>↻ Refresh</button>
      </div>
      <p style={{ color: '#64748b', marginBottom: 40 }}>{wallet.address.slice(0,8)}...{wallet.address.slice(-6)}</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
      ) : projects.length === 0 ? (
        <Card style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No projects yet</h3>
          <p style={{ color: '#64748b' }}>Hire your first AI agent to get started</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {projects.map(p => (
            <Card key={p.id} style={{ padding: 24, cursor: p.result ? 'pointer' : 'default', transition: 'border-color 0.2s', borderColor: p.result ? 'rgba(99,102,241,0.3)' : undefined }}
              onClick={() => p.result && setSelected(p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{p.title}</span>
                    <span style={{ background: (STATUS_COLOR[p.status] || '#64748b') + '20', color: STATUS_COLOR[p.status] || '#64748b', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {p.status === 'processing' ? '⚙️ Processing…' : p.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{p.agent_name} · {p.tier} tier · {new Date(p.created_at).toLocaleDateString()}</div>
                  <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{p.description.slice(0, 120)}{p.description.length > 120 ? '…' : ''}</div>
                  {p.result && <div style={{ marginTop: 10, color: '#10b981', fontSize: 13, fontWeight: 600 }}>✅ Result ready — click to view</div>}
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', fontFamily: "'Space Grotesk'" }}>{p.ril_amount} <span style={{ fontSize: 12 }}>RIL</span></div>
                  {p.tx_hash && <a href={`https://basescan.org/tx/${p.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6' }} onClick={e => e.stopPropagation()}>View tx ↗</a>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Submit Flow ────────────────────────────────────────────────────────────────
async function handleSubmitProject({ agentId, tier, title, description, price, paymentMethod = 'ril', ethPrice = '0', wallet, walletProvider, setToast }) {
  if (!wallet.connected) return setToast({ type: 'error', msg: 'Connect your wallet first.' })
  if (!title || !description) return setToast({ type: 'error', msg: 'Fill in project title and description.' })

  const treasury = TREASURY
  const payLabel = paymentMethod === 'eth' ? `${ethPrice} ETH` : `${price} RIL`
  setToast({ type: 'info', msg: `Sending ${payLabel} to Rip It Labs treasury…` })

  try {
    // Use the provider from wallet connect — falls back to window.ethereum for MetaMask auto-reconnect
    const rawProvider = walletProvider || window.ethereum
    if (!rawProvider) return setToast({ type: 'error', msg: 'No wallet provider. Please reconnect your wallet.' })
    const provider = new ethers.BrowserProvider(rawProvider)
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    let txHash = ''

    // Pre-flight balance check
    const ethBal = await provider.getBalance(signerAddress)
    if (ethBal === 0n) {
      return setToast({ type: 'error', msg: 'Your wallet has no ETH on Base. You need ETH to pay gas fees.' })
    }

    if (paymentMethod === 'eth') {
      // ── ETH payment — direct send to treasury ─────────────────────────────
      const value = ethers.parseEther(String(ethPrice))
      // Check sufficient ETH (amount + ~0.001 ETH for gas)
      if (ethBal < value + ethers.parseEther('0.001')) {
        return setToast({ type: 'error', msg: `Insufficient ETH. Need ${ethPrice} ETH + gas. Your balance: ${ethers.formatEther(ethBal).slice(0,8)} ETH` })
      }
      const tx = await signer.sendTransaction({
        to: treasury,
        value,
        gasLimit: 21000n,  // plain ETH transfer — fixed gas, no estimation needed
      })
      txHash = tx.hash
      setToast({ type: 'info', msg: `ETH tx submitted: ${txHash.slice(0,10)}… waiting for confirmation…` })
      await tx.wait()

    } else {
      // ── RILCOIN (ERC-20) payment ───────────────────────────────────────────
      const info = await fetch(`${API}/rilcoin`).then(r => r.json())
      if (info.contract_address && info.contract_address !== 'PENDING_DEPLOYMENT') {
        const ril = new ethers.Contract(info.contract_address, RIL_ABI, signer)

        // Check RIL balance before attempting
        const rilBal = await ril.balanceOf(signerAddress)
        const rilAmount = ethers.parseEther(String(price))
        if (rilBal < rilAmount) {
          const have = Number(ethers.formatEther(rilBal)).toLocaleString()
          return setToast({ type: 'error', msg: `Insufficient RILCOIN. Need ${price} RIL, you have ${have} RIL. Buy RIL on Coinbase or swap on Base.` })
        }

        const tx = await ril.transfer(treasury, rilAmount, {
          gasLimit: 100000n,  // fixed gas for ERC-20 transfer — avoids estimation failure
        })
        txHash = tx.hash
        setToast({ type: 'info', msg: `RIL tx submitted: ${txHash.slice(0,10)}… waiting for confirmation…` })
        await tx.wait()
      } else {
        // No contract deployed — queue with manual payment instructions
        setToast({ type: 'success', msg: `📋 Project queued! Send ${price} RIL to ${treasury.slice(0,8)}…${treasury.slice(-6)} on Base to activate.` })
        return
      }
    }

    // Payment confirmed on-chain — now create project and activate it
    const res = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, tier, title, description, wallet_address: wallet.address })
    })
    const proj = await res.json()

    await fetch(`${API}/projects/${proj.project_id}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_hash: txHash })
    })
    setToast({ type: 'success', msg: `✅ Payment confirmed! Your AI agent is working on your project…` })
    return { projectId: proj.project_id }

  } catch (err) {
    // Decode the most common ethers v6 / wallet errors into readable messages
    const raw = err?.message || ''
    let msg = 'Transaction failed.'
    if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') {
      msg = 'Transaction cancelled — please approve in your wallet.'
    } else if (raw.includes('missing revert data') || raw.includes('gas')) {
      msg = 'Gas estimation failed. Make sure you have ETH on Base for gas fees and sufficient token balance.'
    } else if (raw.includes('insufficient funds')) {
      msg = 'Insufficient funds for gas. Add ETH to your wallet on Base network.'
    } else if (raw.includes('nonce')) {
      msg = 'Nonce error — please wait a moment and try again.'
    } else if (raw.length > 0) {
      msg = raw.slice(0, 140)
    }
    setToast({ type: 'error', msg })
  }
}

// ── Stripe Result Poller ──────────────────────────────────────────────────────
function StripeResultModal({ projectId, onClose }) {
  const [status, setStatus]   = useState('processing')
  const [result, setResult]   = useState('')
  const [agentName, setAgentName] = useState('Your AI Agent')
  const pollRef = useRef(null)

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetch(`${API}/projects/${projectId}`).then(r => r.json())
        if (data.agent_name) setAgentName(data.agent_name)
        if (data.status === 'completed') {
          clearInterval(pollRef.current)
          setStatus('completed')
          setResult(data.result || '')
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current)
          setStatus('failed')
          setResult(data.result || 'Agent encountered an error.')
        } else if (data.status === 'pending_stripe') {
          // Still waiting for Stripe webhook — keep polling
        }
      } catch {}
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [projectId])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9' }}>{agentName}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: status === 'completed' ? 'rgba(16,185,129,0.15)' : status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
                color: status === 'completed' ? '#34d399' : status === 'failed' ? '#f87171' : '#10b981',
                textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {status === 'completed' ? '✓ Done' : status === 'failed' ? '✕ Failed' : '⏳ Working…'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>💳 Paid via Stripe</div>
          </div>
          {status !== 'processing' && <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', width: 34, height: 34, cursor: 'pointer', fontSize: 18 }}>×</button>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {status === 'processing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 52, height: 52, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>Payment confirmed — agent is working…</div>
              <div style={{ color: '#64748b', fontSize: 14 }}>Results appear here automatically. This typically takes 15–60 seconds.</div>
              <div style={{ marginTop: 20, fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>Project: {projectId?.slice(0,16)}…</div>
            </div>
          )}
          {(status === 'completed' || status === 'failed') && (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: '#e2e8f0' }}>{result}</div>
          )}
        </div>
        {status === 'completed' && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => navigator.clipboard?.writeText(result)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📋 Copy</button>
            <button onClick={onClose} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' }
  const c = colors[toast.type] || '#3b82f6'
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, maxWidth: 420, background: '#0d0f17', border: `1px solid ${c}40`, borderLeft: `4px solid ${c}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'fadeUp 0.3s ease' }}>
      <div style={{ flex: 1, fontSize: 14, color: '#f1f5f9', lineHeight: 1.5 }}>{toast.msg}</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1, marginTop: -2 }}>×</button>
    </div>
  )
}

// ── Whitepaper + Investor Banner ───────────────────────────────────────────────
function ResourceBanner({ onNav }) {
  return (
    <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Badge color="#a5b4fc">RESOURCES</Badge>
        <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, marginTop: 16, letterSpacing: -1 }}>
          Go deeper into <span className="grad">Rip It Labs</span>
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>

        {/* Whitepaper card */}
        <a href="https://whitepaper.ripitlabs.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Card style={{ padding: 36, cursor: 'pointer', transition: 'all 0.22s', height: '100%' }} glow="#6366f1">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#6366f1,#a5b4fc)' }} />
            <div style={{ fontSize: 52, marginBottom: 20 }}>📄</div>
            <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: 1, marginBottom: 16 }}>WHITEPAPER</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>Read the Whitepaper</h3>
            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              Full technical and economic documentation — RILBOT architecture, RILCOIN tokenomics, agent protocol, ISO 20022 compliance, and long-term vision.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {['Architecture', 'Tokenomics', 'Agent Protocol', 'ISO 20022'].map(t => (
                <span key={t} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#a5b4fc' }}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
              Read Whitepaper ↗
            </div>
          </Card>
        </a>

        {/* Investor card */}
        <Card style={{ padding: 36, cursor: 'pointer', transition: 'all 0.22s', position: 'relative', overflow: 'hidden' }} glow="#10b981"
          onClick={() => onNav('investors')}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
          <div style={{ fontSize: 52, marginBottom: 20 }}>📊</div>
          <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: 1, marginBottom: 16 }}>INVESTOR RELATIONS</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>Investor Data Room</h3>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
            Pitch deck, financial model, cap table, SAFE template, traction metrics, and competitive analysis — everything accredited investors need.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {['Pitch Deck', 'Financials', 'Cap Table', 'SAFE'].map(t => (
              <span key={t} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#34d399' }}>{t}</span>
            ))}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            View Data Room →
          </div>
        </Card>

      </div>
    </section>
  )
}

// ── App Portfolio Page ─────────────────────────────────────────────────────────
const RIL_APPS = [
  {
    id: 'rilbot', emoji: '🤖', name: 'RILBOT', tag: 'AI Agent Marketplace',
    desc: '632 AI agents across 59 teams. Hire, deploy, and manage AI for every business function.',
    port: 8011, url: 'https://rilbot.ripitlabs.com', status: 'live', color: '#3b82f6',
    stack: ['FastAPI', 'React', 'RILCOIN'],
  },
  {
    id: 'ytax', emoji: '📊', name: 'YTax', tag: 'AI Tax Platform',
    desc: 'IRS MeF e-filing, Form 8879 digital signatures, 75 IRS forms, blockchain audit trail.',
    port: 7000, url: null, status: 'live', color: '#6366f1',
    stack: ['FastAPI', 'React', 'Polygon'],
  },
  {
    id: 'shopclass', emoji: '🔧', name: 'ShopClass', tag: 'Auto Shop Learning',
    desc: '25 repair procedures, 40 diagnostic symptoms, animated SVG diagrams, student accounts.',
    port: 8003, url: null, status: 'live', color: '#f59e0b',
    stack: ['FastAPI', 'React', 'Claude AI'],
  },
  {
    id: 'locallore', emoji: '🗺️', name: 'LocalLore', tag: 'AI History Tours',
    desc: 'Interactive map, Claude historian, OpenStreetMap POIs, Wikimedia photos, 12 languages.',
    port: 8013, url: 'https://locallore.ripitlabs.com', status: 'live', color: '#10b981',
    stack: ['FastAPI', 'React', 'Leaflet'],
  },
  {
    id: 'saferoads', emoji: '🛣️', name: 'Safe Roads', tag: 'Road Safety Platform',
    desc: 'AI road safety and incident reporting with live alerts, route analysis, and community reporting.',
    port: 8002, url: null, status: 'live', color: '#ef4444',
    stack: ['FastAPI', 'React', 'Maps API'],
  },
  {
    id: 'neighboreats', emoji: '🍲', name: 'NeighborEats', tag: 'Home Cook Marketplace',
    desc: 'Order from real home cooks in your neighborhood. Local food, local culture.',
    port: 8004, url: null, status: 'beta', color: '#f97316',
    stack: ['FastAPI', 'React', 'Stripe'],
  },
  {
    id: 'islandrush', emoji: '🛵', name: 'IslandRush', tag: 'Island Delivery',
    desc: 'Like DoorDash, but on mopeds in paradise. Last-mile island delivery platform.',
    port: 8005, url: null, status: 'beta', color: '#06b6d4',
    stack: ['FastAPI', 'React', 'Maps API'],
  },
  {
    id: 'sedonaview', emoji: '🏜️', name: 'SedonaView', tag: 'Property & Tourism',
    desc: 'Cottonwood, AZ — short-term rental management, local tours, and concierge services.',
    port: 8006, url: null, status: 'beta', color: '#dc2626',
    stack: ['FastAPI', 'React'],
  },
  {
    id: 'woodinville', emoji: '🍷', name: 'Woodinville', tag: 'Wine Country App',
    desc: 'Woodinville, WA wine country guide — vineyard discovery, tasting rooms, events.',
    port: 8007, url: null, status: 'beta', color: '#7c3aed',
    stack: ['FastAPI', 'React'],
  },
  {
    id: 'locationiq', emoji: '📍', name: 'LocationIQ', tag: 'Location Intelligence',
    desc: 'Consent GPS sharing, fleet tracking, device status, and foot traffic analytics.',
    port: 8008, url: null, status: 'beta', color: '#0ea5e9',
    stack: ['FastAPI', 'React', 'Mapbox'],
  },
  {
    id: 'happymouth', emoji: '🦷', name: 'HappyMouth', tag: 'Dental Tourism',
    desc: 'Los Algodones, Mexico dental tourism platform — clinics, pricing, appointments, travel.',
    port: 8009, url: null, status: 'beta', color: '#38bdf8',
    stack: ['FastAPI', 'React'],
  },
  {
    id: 'inkdesk', emoji: '🎨', name: 'InkDesk', tag: 'Tattoo Studio Platform',
    desc: 'Multi-tenant tattoo studio management — booking, AI agent, portfolio, client records.',
    port: 8010, url: null, status: 'beta', color: '#ec4899',
    stack: ['FastAPI', 'React', 'Claude AI'],
  },
  {
    id: 'djlandscaping', emoji: '🌵', name: 'DJ Landscaping', tag: 'Property Maintenance',
    desc: 'Arizona landscaping & property maintenance — services, scheduling, AI quote system.',
    port: 8010, url: null, status: 'beta', color: '#84cc16',
    stack: ['FastAPI', 'React'],
  },
  {
    id: 'votechain', emoji: '🗳️', name: 'VoteChain', tag: 'Blockchain Voting',
    desc: 'Immutable blockchain-based voting — anonymous ballots, audit trail, real-time results.',
    port: 7001, url: null, status: 'beta', color: '#a855f7',
    stack: ['FastAPI', 'React', 'Blockchain'],
  },
  {
    id: 'strut', emoji: '👗', name: 'Strut', tag: 'Asset & Fashion Tracker',
    desc: 'Asset tracking with blockchain custody — wardrobe management, ownership records, marketplace.',
    port: 5000, url: null, status: 'beta', color: '#f472b6',
    stack: ['FastAPI', 'React', 'Blockchain'],
  },
  {
    id: 'whitepaper', emoji: '📄', name: 'Whitepaper', tag: 'Investor Docs',
    desc: 'Rip It Labs technical whitepaper — platform architecture, RILCOIN tokenomics, agent framework.',
    port: 8012, url: 'https://whitepaper.ripitlabs.com', status: 'live', color: '#64748b',
    stack: ['Static', 'HTML'],
  },
  {
    id: 'tradingbot', emoji: '📈', name: 'TradingBot', tag: 'J Bravo AI Trading',
    desc: 'Live AI trading bot — J Bravo strategy with TD Sequential, 9/21/50 EMA, RSI, MACD. Crypto via Binance US + stocks via Alpaca. Paper mode by default.',
    port: 8014, url: 'https://tradingbot.ripitlabs.com', status: 'live', color: '#22c55e',
    stack: ['FastAPI', 'React', 'Binance US', 'Alpaca'],
  },
  {
    id: 'voicestudio', emoji: '🎙️', name: 'VoiceStudio', tag: 'AI Text-to-Speech',
    desc: '11 AI voices (Kokoro ONNX), WAV download, speed control, generation history. Fully local — no API keys needed.',
    port: 8016, url: 'https://voice.ripitlabs.com', status: 'live', color: '#8b5cf6',
    stack: ['FastAPI', 'React', 'Kokoro ONNX'],
  },
  {
    id: 'geoblock', emoji: '📍', name: 'GeoBlock', tag: 'Location Privacy',
    desc: 'Block and spoof GPS & IP geolocation in any browser. Interactive map, 11 city presets, bookmarklet, Tampermonkey script, Android & iOS guides.',
    port: 8018, url: 'https://geoblock.ripitlabs.com', status: 'live', color: '#f43f5e',
    stack: ['FastAPI', 'React', 'Leaflet', 'JS Injection'],
  },
]

function AppPortfolio({ onNav }) {
  const [filter, setFilter] = useState('all')
  const filters = ['all', 'live', 'beta']
  const visible = filter === 'all' ? RIL_APPS : RIL_APPS.filter(a => a.status === filter)

  const statusBadge = (status) => {
    const s = { live: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#10b981', label: '● Live' },
                beta: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#f59e0b', label: '◑ Beta' } }
    const c = s[status] || s.beta
    return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>{c.label}</span>
  }

  return (
    <div>
    {/* Sticky top bar */}
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: 60, background: 'rgba(7,8,12,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <Logo height={30} />
        <div>
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: 16, color: '#f1f5f9', letterSpacing: -0.5 }}>RILBOT</div>
          <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>by Rip It Labs</div>
        </div>
      </a>
      <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
      <span style={{ color: '#64748b', fontSize: 13 }}>App Portfolio</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <a href="/" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#94a3b8', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>← RILBOT</a>
        <a href="/portfolio#agents" onClick={e=>{e.preventDefault();onNav&&onNav('agents')}} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#3b82f6', textDecoration: 'none', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>AI Agents</a>
      </div>
    </div>
    <section style={{ padding: '88px 24px 120px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>RIP IT LABS</div>
        <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, letterSpacing: -1 }}>App Portfolio</h1>
        <p style={{ color: '#64748b', fontSize: 18, maxWidth: 600 }}>
          {RIL_APPS.length} applications built on the Rip It Labs AI platform — from marketplaces to local services to blockchain infrastructure.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40, maxWidth: 500 }}>
        {[
          { n: RIL_APPS.length, label: 'Total Apps' },
          { n: RIL_APPS.filter(a => a.status === 'live').length, label: 'Live' },
          { n: RIL_APPS.filter(a => a.status === 'beta').length, label: 'Beta' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0d0d16', border: '1px solid #1e1e2e', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#f1f5f9' }}>{s.n}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
            background: filter === f ? '#3b82f6' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filter === f ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
            color: filter === f ? '#fff' : '#64748b',
          }}>{f}</button>
        ))}
      </div>

      {/* App grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {visible.map(app => (
          <div key={app.id} style={{
            background: '#0d0d16', border: '1px solid #1e1e2e', borderRadius: 16, padding: '22px 22px 18px',
            display: 'flex', flexDirection: 'column', gap: 14, transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = app.color + '60'; e.currentTarget.style.boxShadow = `0 4px 24px ${app.color}18` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: app.color + '18', border: `1px solid ${app.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {app.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>{app.name}</span>
                  {statusBadge(app.status)}
                </div>
                <div style={{ fontSize: 12, color: app.color, fontWeight: 600 }}>{app.tag}</div>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, margin: 0 }}>{app.desc}</p>

            {/* Stack chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {app.stack.map(s => (
                <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', letterSpacing: 0.3 }}>{s}</span>
              ))}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }}>:{app.port}</span>
            </div>

            {/* Action */}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {(() => {
                const href = app.url || (app.port ? `http://${window.location.hostname}:${app.port}` : null)
                return href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" style={{
                    flex: 1, background: app.color + '18', border: `1px solid ${app.color}40`, borderRadius: 10,
                    padding: '9px 14px', color: app.color, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s',
                  }}>🚀 Open App ↗</a>
                ) : (
                  <button style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                    padding: '9px 14px', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>🔒 Local Only</button>
                )
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 60, padding: '40px 32px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Power Every App with AI Agents</h3>
        <p style={{ color: '#64748b', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>Every app in the portfolio can be supercharged with RILBOT AI agents — 632 specialists ready to hire.</p>
        <Btn onClick={() => onNav('agents')} variant="primary">Browse AI Agents →</Btn>
      </div>
    </section>
    </div>
  )
}

// ── Investor Vault Lock Screen ─────────────────────────────────────────────────
function InvestorVault({ onUnlock }) {
  const [pin, setPin] = React.useState('')
  const [shake, setShake] = React.useState(false)
  const [dots, setDots] = React.useState([false,false,false,false])
  const VAULT_PIN = '1234'

  const handleKey = (k) => {
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    setDots(d => d.map((_,i) => i < next.length))
    if (next.length === 4) {
      setTimeout(() => {
        if (next === VAULT_PIN) {
          onUnlock()
        } else {
          setShake(true)
          setTimeout(() => { setPin(''); setDots([false,false,false,false]); setShake(false) }, 600)
        }
      }, 300)
    }
  }

  const handleDel = () => {
    const next = pin.slice(0, -1)
    setPin(next)
    setDots(d => d.map((_,i) => i < next.length))
  }

  const keys = [['1','2','3'],['4','5','6'],['7','8','9'],['*','0','⌫']]

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      {/* Logo */}
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, letterSpacing:2, color:'#fff', marginBottom:8 }}>
        RIP IT <span style={{color:'#f59e0b'}}>LABS</span>
      </div>
      <div style={{ fontSize:12, color:'#475569', letterSpacing:2, textTransform:'uppercase', marginBottom:48 }}>Investor Data Room</div>

      {/* Vault icon */}
      <div style={{ width:88, height:88, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, marginBottom:24, boxShadow:'0 0 40px rgba(37,99,235,.4)' }}>🔒</div>

      <div style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:8 }}>Secure Access</div>
      <div style={{ fontSize:14, color:'#64748b', marginBottom:36 }}>Enter your 4-digit vault PIN</div>

      {/* Dots */}
      <div style={{ display:'flex', gap:16, marginBottom:40 }}>
        {dots.map((filled, i) => (
          <div key={i} style={{ width:16, height:16, borderRadius:'50%', background: filled ? '#f59e0b' : 'transparent', border:'2px solid', borderColor: filled ? '#f59e0b' : '#334155', transition:'all .15s', transform: shake ? 'translateX(4px)' : 'none' }} />
        ))}
      </div>

      {/* Keypad */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:240, width:'100%' }}>
        {keys.flat().map(k => (
          <button key={k} onClick={() => k === '⌫' ? handleDel() : k === '*' ? null : handleKey(k)}
            style={{ padding:'18px 0', background: k === '*' ? 'transparent' : 'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, fontSize: k === '⌫' ? 20 : 22, fontWeight:600, color: k === '*' ? 'transparent' : '#fff', cursor: k === '*' ? 'default' : 'pointer', transition:'background .15s' }}
            onMouseEnter={e => { if (k !== '*') e.target.style.background='rgba(255,255,255,.12)' }}
            onMouseLeave={e => { if (k !== '*') e.target.style.background='rgba(255,255,255,.06)' }}
          >{k}</button>
        ))}
      </div>

      <div style={{ marginTop:40, fontSize:13, color:'#334155' }}>Authorized investors only · <a href="mailto:tim@ripitlabs.com" style={{color:'#2563eb'}}>Request access</a></div>
    </div>
  )
}

// ── Investors Page ─────────────────────────────────────────────────────────────
function InvestorsPage({ onNav }) {
  const [unlocked, setUnlocked] = React.useState(false)

  if (!unlocked) return <InvestorVault onUnlock={() => setUnlocked(true)} />

  const docs = [
    { emoji: '📊', title: 'Pitch Deck', desc: '12-slide investor presentation covering market opportunity, product, traction, and financials.', href: null, action: () => window.open('/pitch-deck', '_blank') },
    { emoji: '📄', title: 'One Pager', desc: 'Single-page executive summary of Rip It Labs and the RILBOT platform.', href: '/investor/one_pager.html' },
    { emoji: '💰', title: 'Financial Model', desc: '5-year P&L, user growth, cash flow, unit economics, and assumptions — interactive 6-tab model.', href: '/investor/financial_model.html' },
    { emoji: '🏆', title: 'Competitive Moat', desc: 'How RILBOT dominates the AI agent market and why competitors cannot replicate.', href: '/investor/competitive_moat.html' },
    { emoji: '🪙', title: 'RILCOIN Tokenomics', desc: 'Full token economics — supply, allocation, burn mechanics, utility, and ISO 20022 compliance.', href: '/investor/rilcoin_tokenomics.html' },
    { emoji: '🏗', title: 'Technical Architecture', desc: 'Deep dive into the RILfather agent platform, coordinator pattern, and infrastructure.', href: '/investor/technical_architecture.html' },
    { emoji: '🤖', title: 'Agent Catalog', desc: 'Complete catalog of all 632 AI agents across 59 teams.', href: '/investor/agent_catalog.html' },
    { emoji: '📈', title: 'Traction Tracker', desc: 'Real-time metrics dashboard: pilot users, revenue, agent runs, and growth KPIs.', href: '/investor/traction_tracker.html' },
    { emoji: '❓', title: 'Investor FAQ', desc: 'Answers to the 20 most common investor questions about RILBOT and RILCOIN.', href: '/investor/faq.html' },
    { emoji: '⚖️', title: 'SAFE Template', desc: 'Standard SAFE note template for seed round investors.', href: '/investor/legal/safe_template.html' },
    { emoji: '🗂', title: 'Cap Table', desc: 'Current equity structure, ownership breakdown, and dilution modeling.', href: '/investor/legal/cap_table.html' },
    { emoji: '🔏', title: 'NDA', desc: 'Non-disclosure agreement — sign electronically to access all confidential materials.', href: '/investor/legal/nda.html' },
    { emoji: '📰', title: 'Press Release', desc: 'Draft press release announcing RILBOT launch for media and PR distribution.', href: '/investor/press_release.html' },
    { emoji: '💵', title: 'Wire Instructions', desc: 'Step-by-step guide to completing your investment — wire details, ACH, and pre-wire checklist.', href: '/investor/wire_instructions.html' },
    { emoji: '📅', title: 'Schedule a Call', desc: 'Book a 15-minute intro call with Tim Cavin, CEO — pick a date and time instantly.', href: '/investor/schedule_call.html' },
    { emoji: '✍️', title: 'Invest Now', desc: 'Submit your investment interest form — accreditation, amount, and contact info.', href: '/investor/invest_now.html' },
    { emoji: '🛡️', title: 'IP & Legal Protection', desc: 'Patent filings, trademarks, copyright, and full legal protection package for Rip It Labs LLC — drafted by the RILBOT Legal & Patent Agent Team.', href: '/investor/legal/ip_protection.html' },
  ]

  return (
    <section style={{ padding: '100px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <Badge color="#10b981">INVESTOR RELATIONS</Badge>
        <h1 style={{ fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, letterSpacing: -2, marginTop: 20, marginBottom: 16 }}>
          Invest in the Future<br /><span className="grad">of AI Agents</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 18, maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Rip It Labs is building the world's largest AI agent platform — 632 specialists, 35 industries, one utility token. Access our full data room below.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://whitepaper.ripitlabs.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Btn variant="primary" size="lg">📄 Read Whitepaper</Btn>
          </a>
          <Btn onClick={() => onNav('agents')} variant="ghost" size="lg">🤖 See All 632 Agents</Btn>
        </div>
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 64 }}>
        {[
          { label: 'AI Agents', value: '632', icon: '🤖', color: '#3b82f6' },
          { label: 'Industries', value: '35', icon: '🏭', color: '#10b981' },
          { label: 'Divisions', value: '16', icon: '🏢', color: '#f59e0b' },
          { label: 'Token Supply', value: '1B RIL', icon: '🪙', color: '#8b5cf6' },
          { label: 'Blockchain', value: 'Base', icon: '⛓', color: '#06b6d4' },
          { label: 'Compliance', value: 'ISO 20022', icon: '🏦', color: '#ec4899' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} style={{ padding: '20px 16px', textAlign: 'center' }} glow={color}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk'", marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Data room */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 24 }}>🗃</div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Data Room</h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>All investor materials in one place</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {docs.map(({ emoji, title, desc, href, action }) => (
            <Card key={title} style={{ padding: 24, cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => action ? action() : href && window.open(href, '_blank')}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 32, lineHeight: 1, minWidth: 40 }}>{emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#f1f5f9' }}>{title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{desc}</div>
                  <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>Open document →</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <Card style={{ padding: 48, textAlign: 'center', background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(16,185,129,0.08))' }} glow="#10b981">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Ready to Invest?</h2>
        <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
          We're raising our seed round. Schedule a call with Tim Cavin, CEO of Rip It Labs, to discuss the opportunity.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={() => onNav('pilot')} variant="green" size="lg">🚀 Join as Pilot Partner</Btn>
          <a href="mailto:Tim@RipItLabs.com" style={{ textDecoration: 'none' }}>
            <Btn variant="ghost" size="lg">✉️ Tim@RipItLabs.com</Btn>
          </a>
        </div>
      </Card>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer({ onNav }) {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0 0 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Whitepaper & Investor Tabs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 48 }}>
          <a href="https://whitepaper.ripitlabs.com" target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none', display: 'block', padding: '32px 40px', background: 'rgba(99,102,241,0.07)', borderRight: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 36 }}>📄</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: 4 }}>Whitepaper</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Read the Whitepaper ↗</div>
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Technical architecture, RILCOIN tokenomics, agent protocol, and ISO 20022 compliance documentation.
            </p>
          </a>

          <button onClick={() => onNav('investors')}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(16,185,129,0.07)', border: 'none', cursor: 'pointer', padding: '32px 40px', transition: 'background 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 36 }}>📊</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: '#34d399', textTransform: 'uppercase', marginBottom: 4 }}>Investors</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Investor Data Room →</div>
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Pitch deck, financials, cap table, SAFE template, traction metrics, and competitive analysis.
            </p>
          </button>
        </div>

        {/* Top columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Logo height={32} />
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: 20, color: '#f1f5f9' }}>RILBOT</div>
            </div>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              The world's largest AI agent marketplace. 632 specialists. 35 industries. Powered by RILCOIN on Base.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '6px 12px' }}>
              <span style={{ fontSize: 14 }}>🏦</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>ISO 20022 Compliant</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Platform</div>
            {[
              ['AI Agents', 'agents'],
              ['Tokenomics', 'tokenomics'],
              ['How It Works', 'how'],
              ['Build an Agent', 'builder'],
              ['Our Empire', 'empire'],
              ['Free Pilot', 'pilot'],
            ].map(([label, p]) => (
              <button key={p} onClick={() => onNav(p)} style={{ display: 'block', background: 'none', border: 'none', color: '#64748b', fontSize: 14, padding: '5px 0', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}>{label}</button>
            ))}
          </div>

          {/* Whitepaper */}
          <div>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Whitepaper</div>
            <a href="https://whitepaper.ripitlabs.com" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#a5b4fc', fontSize: 14, padding: '5px 0', textDecoration: 'none', marginBottom: 8, fontWeight: 600 }}>
              📄 Read Full Whitepaper ↗
            </a>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
              Deep-dive technical and economic documentation covering RILBOT's architecture, RILCOIN tokenomics, and long-term vision.
            </p>
            {[
              ['Technical Architecture', 'https://whitepaper.ripitlabs.com'],
              ['RILCOIN Economics', 'https://whitepaper.ripitlabs.com'],
              ['Agent Protocol', 'https://whitepaper.ripitlabs.com'],
              ['ISO 20022 Compliance', 'https://whitepaper.ripitlabs.com'],
            ].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#64748b', fontSize: 13, padding: '4px 0', textDecoration: 'none' }}>→ {label}</a>
            ))}
          </div>

          {/* Investors */}
          <div>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Investors</div>
            <button onClick={() => onNav('investors')} style={{ display: 'block', background: 'none', border: 'none', color: '#34d399', fontSize: 14, padding: '5px 0', cursor: 'pointer', textAlign: 'left', fontWeight: 600, marginBottom: 8 }}>
              📊 Investor Data Room →
            </button>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
              Pitch deck, financials, cap table, SAFE template, and full traction metrics for accredited investors.
            </p>
            {[
              ['Pitch Deck', 'investors'],
              ['Financial Model', 'investors'],
              ['Traction Tracker', 'investors'],
              ['SAFE Template', 'investors'],
            ].map(([label, p]) => (
              <button key={label} onClick={() => onNav(p)} style={{ display: 'block', background: 'none', border: 'none', color: '#64748b', fontSize: 13, padding: '4px 0', cursor: 'pointer', textAlign: 'left' }}>→ {label}</button>
            ))}
            <a href="mailto:Tim@RipItLabs.com" style={{ display: 'block', marginTop: 12, color: '#10b981', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>✉️ Tim@RipItLabs.com</a>
          </div>

        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 32 }}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              ['ripitlabs.com', 'https://ripitlabs.com'],
              ['Basescan', 'https://basescan.org'],
              ['DEX Screener', 'https://dexscreener.com/base/0xafaa5753e29d14712b2a6f6cb4e26d2ca4aeba36'],
              ['Aerodrome', 'https://aerodrome.finance'],
              ['Coinbase', 'https://coinbase.com'],
              ['Base Network', 'https://base.org'],
            ].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#3b82f6' }}>⛓ Base Network</span>
            <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#f59e0b' }}>ERC-20</span>
            <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#10b981' }}>🔒 Audited</span>
            <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#8b5cf6' }}>⚡ RILfather Powered</span>
            <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>🏦 ISO 20022</span>
          </div>
          <p style={{ color: '#334155', fontSize: 12, textAlign: 'center' }}>© {new Date().getFullYear()} Rip It Labs. RILCOIN is a utility token. Not investment advice.</p>
        </div>
      </div>
    </footer>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const pathMap = { portfolio: 'projects', investors: 'investors', empire: 'empire', builder: 'builder', pilot: 'pilot' }
  const initPage = pathMap[window.location.pathname.replace(/^\//, '')] || 'home'
  const [page, setPage] = useState(initPage)
  const [rilcoin, setRilcoin] = useState(null)
  const [toast, setToast] = useState(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const walletProviderRef = useRef(null)  // stores the raw EIP-1193 provider used at connect time
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [stripeProjectId, setStripeProjectId] = useState(null)

  // Freemium tier state — in production this would come from an auth/billing API
  const [tier, setTier] = useState('free')          // 'free' | 'pro' | 'enterprise'
  const [usageToday, setUsageToday] = useState(3)   // demo value; real value from /api/usage

  useEffect(() => { fetch(`${API}/rilcoin`).then(r => r.json()).then(setRilcoin) }, [])

  // Handle Stripe return — ?project_id=xxx&payment=card
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'card' && params.get('project_id')) {
      setStripeProjectId(params.get('project_id'))
      window.history.replaceState({}, '', '/')
    } else if (params.get('payment') === 'cancelled') {
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Open wallet modal if ?connect=1 in URL
  useEffect(() => {
    if (window.location.search.includes('connect=1')) {
      setWalletModalOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    const handler = () => setWalletModalOpen(true)
    window.addEventListener('open-wallet-modal', handler)
    return () => window.removeEventListener('open-wallet-modal', handler)
  }, [])

  const { wallet, setWallet, disconnect, connecting } = useWallet(rilcoin?.contract_address)

  const handleConnect = () => setWalletModalOpen(true)

  const onNav = (p) => {
    setPage(p)
    const urlMap = { projects: 'portfolio', investors: 'investors', empire: 'empire', builder: 'builder', pilot: 'pilot', home: '' }
    if (urlMap[p] !== undefined) window.history.pushState({}, '', urlMap[p] ? `/${urlMap[p]}` : '/')
    if (p === 'builder' || p === 'empire' || p === 'projects' || p === 'investors' || p === 'pilot') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (p !== 'home') {
      setTimeout(() => { const el = document.getElementById(p); if (el) el.scrollIntoView({ behavior: 'smooth' }) }, 100)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const onSubmit = async (params) => {
    setUsageToday(n => n + 1)
    const result = await handleSubmitProject({ ...params, wallet, walletProvider: walletProviderRef.current, setToast })
    return result  // passes { projectId } back to AgentModal for polling
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 8000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const nav = (
    <Nav wallet={wallet} onConnect={handleConnect} onDisconnect={disconnect} onNav={onNav} page={page} />
  )

  const modals = (
    <>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} onConnected={(data) => { walletProviderRef.current = data.rawProvider; setWallet(data); setWalletModalOpen(false) }} />
      <Toast toast={toast} onClose={() => setToast(null)} />
      {stripeProjectId && <StripeResultModal projectId={stripeProjectId} onClose={() => setStripeProjectId(null)} />}
    </>
  )

  if (page === 'builder')   return <>{nav}<AgentBuilder onNav={onNav} />{modals}</>
  if (page === 'pilot')     return <>{nav}<Pilot />{modals}</>
  if (page === 'empire')    return <>{nav}<Empire onNav={onNav} /><Footer onNav={onNav} />{modals}</>
  if (page === 'investors') return <>{nav}<InvestorsPage onNav={onNav} /><Footer onNav={onNav} />{modals}</>
  if (page === 'projects')  return <>{nav}<AppPortfolio onNav={onNav} /><Footer onNav={onNav} />{modals}</>

  return (
    <>
      {nav}
      <main>
        <Hero onNav={onNav} rilcoin={rilcoin} onConnect={handleConnect} wallet={wallet} />
        <HowItWorks />
        <AgentMarketplace wallet={wallet} onSubmit={onSubmit} />
        <Tokenomics rilcoin={rilcoin} />
        <ResourceBanner onNav={onNav} />
        <MyProjects wallet={wallet} />
      </main>
      <Footer onNav={onNav} />
      {modals}
    </>
  )
}
