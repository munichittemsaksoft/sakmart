import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/templates' },
  { label: 'Submit', href: '/submit' },
  { label: 'Docs', href: '/docs' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

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
              SAK<span className="text-primary-500">mart</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className="nav-link">{l.label}</Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
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
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg border border-surface-border shadow-modal py-1 z-50">
                      <Link to="/dashboard" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-800 hover:bg-surface-soft">
                        <LayoutDashboard size={15} /> Dashboard
                      </Link>
                      <Link to={`/u/${user.username}`} onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-800 hover:bg-surface-soft">
                        <User size={15} /> Profile
                      </Link>
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

          {/* Mobile toggle */}
          <button className="md:hidden p-2 rounded-lg hover:bg-surface-muted" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-surface-border bg-white px-4 py-4 space-y-2">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} to={l.href} onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-dark-800 hover:text-primary-500">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-2 text-sm">Dashboard</Link>
              <button onClick={() => { handleLogout(); setOpen(false) }} className="block py-2 text-sm text-red-600">Log out</button>
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
