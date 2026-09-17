import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    if (previousPath.current !== pathname) {
      window.scrollTo(0, 0)
      document.getElementById('main-content')?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pathname])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className={`app-header${pathname === '/' ? '' : ' app-header-compact'}`}>
        <h1>{pathname === '/' ? 'Reverse Ladders' : <Link to="/" className="brand-link">Reverse Ladders</Link>}</h1>
      </header>
      {!online && <p className="offline-notice" role="status">Offline · Your workouts save on this device.</p>}
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
