import { Component } from 'react';
import Icon from './Icon.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Algo inesperado aconteceu.';

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg, #f4f4f0)',
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            background: 'var(--surface, #fff)',
            border: '1px solid var(--line, #e4e4e0)',
            borderRadius: 14,
            padding: 28,
            textAlign: 'center',
            boxShadow: '0 8px 28px rgba(0,0,0,.08)',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              margin: '0 auto 16px',
              background: 'var(--bad-tint, #fee)',
              color: 'var(--bad, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="alert" size={26} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            Algo deu errado
          </h1>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--muted, #71757f)', lineHeight: 1.6 }}>
            Encontramos um erro ao renderizar essa parte do aplicativo. Você pode tentar voltar ou recarregar a página.
          </p>
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--surface-2, #fafaf6)',
              border: '1px solid var(--line, #e4e4e0)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 11.5,
              color: 'var(--ink-soft, #3f4550)',
              textAlign: 'left',
              wordBreak: 'break-word',
              maxHeight: 120,
              overflowY: 'auto',
              marginBottom: 18,
            }}
          >
            {message}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn" onClick={this.handleReset}>
              <Icon name="chevron-left" size={13} /> Tentar novamente
            </button>
            <button className="btn primary" onClick={this.handleReload}>
              <Icon name="refresh" size={13} /> Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
