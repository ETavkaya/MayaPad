import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
  message: string
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LaunchBrain render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', padding: '24px', color: '#e2e8f0' }}>
          <h1 style={{ marginBottom: '8px', fontSize: '22px' }}>LaunchBrain crashed while rendering</h1>
          <p style={{ marginBottom: '12px', color: '#94a3b8' }}>
            Open DevTools Console for stack details. Error:
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              border: '1px solid rgba(100,116,139,0.45)',
              borderRadius: '10px',
              padding: '12px',
              background: 'rgba(15,23,42,0.75)',
            }}
          >
            {this.state.message}
          </pre>
        </main>
      )
    }

    return this.props.children
  }
}
