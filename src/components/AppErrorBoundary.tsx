import { Component } from 'react'
import type { ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-shell"><section className="card panel stack" role="alert"><h1>Something went wrong</h1><p>Reload to try again. Reloading does not erase your saved exercises or recorded sets.</p><button className="button" onClick={() => window.location.reload()}>Reload app</button></section></main>
  }
}
