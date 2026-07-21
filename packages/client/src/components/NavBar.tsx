import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  label: string
  to: string
}

const DRIVER_LINKS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Check-Out', to: '/checkout' },
  { label: 'Check-In', to: '/checkin' },
  { label: 'Scan Bags', to: '/bags/scan' },
]

const MANAGER_LINKS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Inventory', to: '/inventory' },
  { label: 'Discrepancies', to: '/discrepancies' },
  { label: 'Reports', to: '/reports' },
  { label: 'Register Bags', to: '/bags/register' },
  { label: 'Accountability', to: '/dashboard/accountability' },
  { label: 'End of Day', to: '/dashboard/end-of-day' },
  { label: 'Manage Drivers', to: '/admin/drivers' },
  { label: 'Manage Stores', to: '/admin/stores' },
]

export default function NavBar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Hide nav on the login page or when not authenticated
  if (!user || pathname === '/login') return null

  const links = user.role === 'MANAGER' ? MANAGER_LINKS : DRIVER_LINKS

  const activeCls = 'text-blue-600 font-semibold'
  const baseCls =
    'block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors'

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <span className="text-base font-bold text-gray-800 sm:text-lg">
          🛍 Bag Recon
        </span>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 sm:flex">
          {links.map(({ label, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${baseCls} ${isActive ? activeCls : ''}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop right section */}
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-xs text-gray-500">{user.email}</span>
          <button
            onClick={logout}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? (
            // X icon
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Hamburger icon
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2 sm:hidden">
          <ul className="space-y-1">
            {links.map(({ label, to }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `${baseCls} ${isActive ? activeCls : ''}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs text-gray-500">{user.email}</p>
            <button
              onClick={() => {
                setMenuOpen(false)
                logout()
              }}
              className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
