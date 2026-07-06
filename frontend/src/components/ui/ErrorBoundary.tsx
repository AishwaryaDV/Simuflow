import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional label shown in the fallback so users know which part failed. */
  label?: string
}

interface State {
  error: Error | null
}

/**
 * Catches render errors so one broken component doesn't blank the whole app.
 * Wrap the app shell and any independently-failable region (e.g. the canvas).
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label ?? 'app', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center gap-3 w-full h-full min-h-48 bg-app-bg p-6 text-center">
        <AlertTriangle size={28} className="text-app-text-3" />
        <p className="text-sm font-medium text-app-text-2">
          {this.props.label ? `The ${this.props.label} hit an error.` : 'Something went wrong.'}
        </p>
        <p className="text-xs text-app-text-3 max-w-sm break-words">{this.state.error.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={this.handleReload}
            className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-app-text-2 hover:text-app-text hover:bg-app-elevated transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
