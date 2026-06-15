import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, User, LogOut, Plus, ExternalLink, BookOpen, Shield, ShoppingBag, Bot, Puzzle, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const ADMIN_ROLES = ['admin', 'super_admin']

const DOCS_LINKS = [
  {
    label: 'Paperclip',
    href: 'https://paperclip.ing/',
    description: 'Visit the Paperclip website',
    icon: BookOpen,
  },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [docsMenu, setDocsMenu] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { items, toggleCart } = useCartStore()
  const cartCount = items.length
  const docsRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (docsRef.current && !docsRef.current.contains(e.target)) setDocsMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    setUserMenu(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-surface-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/saksoft-logo.png" alt="Saksoft" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-lg text-dark-950 tracking-tight">
              SAK<span className="text-primary-500">AgentMart</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/templates" className="nav-link">Templates</Link>
            <Link to="/agents" className="nav-link flex items-center gap-1">
              <Bot size={13} className="text-violet-500" /> Agents
            </Link>
            <Link to="/skills" className="nav-link flex items-center gap-1">
              <Puzzle size={13} className="text-amber-500" /> Skills
            </Link>

            {/* Docs dropdown */}
            <div className="relative" ref={docsRef}>
              <button
                onClick={() => setDocsMenu(!docsMenu)}
                className="nav-link flex items-center gap-1"
              >
                Docs <ChevronDown size={13} className={`transition-transform ${docsMenu ? 'rotate-180' : ''}`} />
              </button>
              {docsMenu && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg border border-surface-border shadow-modal py-1 z-50">
                  {DOCS_LINKS.map(({ label, href, description, icon: Icon }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDocsMenu(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface-soft group"
                    >
                      <Icon size={16} className="text-primary-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm font-medium text-dark-900">
                          {label}
                          <ExternalLink size={11} className="text-dark-700/40 group-hover:text-primary-400" />
                        </div>
                        <p className="text-xs text-dark-700/50 mt-0.5">{description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {/* Cart icon */}
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-lg hover:bg-surface-muted text-dark-700/60 hover:text-dark-900 transition-colors"
              title="Cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <>
                <Link to="/submit" className="btn-accent text-sm px-4 py-2">
                  <Plus size={15} /> New Template
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenu(!userMenu)}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-surface-muted transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-dark-800">{user.username}</span>
                    <ChevronDown size={14} className="text-dark-700" />
                  </button>
                  {userMenu && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg border border-surface-border shadow-modal py-1 z-50">
                      {/* Role badge */}
                      {ADMIN_ROLES.includes(user.role) && (
                        <div className="px-4 py-2 border-b border-surface-border">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.role === 'super_admin' ? 'bg-violet-100 text-violet-700' : 'bg-primary-50 text-primary-700'}`}>
                            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </div>
                      )}
                      <Link to="/profile" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-800 hover:bg-surface-soft">
                        <User size={15} /> Profile
                      </Link>
                      <Link to="/purchases" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-800 hover:bg-surface-soft">
                        <ShoppingBag size={15} /> My Purchases
                      </Link>
                      {ADMIN_ROLES.includes(user.role) && (
                        <Link to="/admin" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-800 hover:bg-surface-soft">
                          <Shield size={15} /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-surface-border my-1" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut size={15} /> Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Log in</Link>
                <Link to="/register" className="btn-primary text-sm">Get started</Link>
              </>
            )}
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-lg hover:bg-surface-muted text-dark-700/60"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-muted" onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-surface-border bg-white px-4 py-4 space-y-2">
          <Link to="/templates" onClick={() => setOpen(false)}
            className="block py-2 text-sm font-medium text-dark-800 hover:text-primary-500">Templates</Link>
          <Link to="/agents" onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 py-2 text-sm font-medium text-dark-800 hover:text-violet-500">
            <Bot size={14} className="text-violet-500" /> Agents
          </Link>
          <Link to="/skills" onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 py-2 text-sm font-medium text-dark-800 hover:text-amber-500">
            <Puzzle size={14} className="text-amber-500" /> Skills
          </Link>
          <Link to="/submit" onClick={() => setOpen(false)}
            className="block py-2 text-sm font-medium text-dark-800 hover:text-primary-500">Submit Template</Link>
          <div className="border-t border-surface-border pt-2 pb-1">
            <p className="text-xs font-semibold text-dark-700/40 uppercase tracking-wider mb-1">Docs</p>
            {DOCS_LINKS.map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 py-2 text-sm font-medium text-dark-800 hover:text-primary-500">
                {label} <ExternalLink size={11} className="text-dark-700/40" />
              </a>
            ))}
          </div>
          {user ? (
            <>
              <div className="border-t border-surface-border pt-2">
                <Link to="/profile" onClick={() => setOpen(false)} className="block py-2 text-sm">Profile</Link>
                <Link to="/purchases" onClick={() => setOpen(false)} className="block py-2 text-sm">My Purchases</Link>
                {ADMIN_ROLES.includes(user.role) && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="block py-2 text-sm">Admin Panel</Link>
                )}
                <button onClick={() => { handleLogout(); setOpen(false) }} className="block py-2 text-sm text-red-600">Log out</button>
              </div>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1 justify-center">Log in</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1 justify-center">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
