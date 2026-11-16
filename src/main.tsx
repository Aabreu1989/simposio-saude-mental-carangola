import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Portal do Simpósio capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-[#d96522] flex items-center justify-center font-black text-2xl border border-[#d96522]/20">
              SUS
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0a3641] tracking-tight">
              1º Simpósio de Saúde Mental
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              O portal está atualizando a visualização. Caso a tela não carregue automaticamente, clique no botão abaixo para recarregar.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#d96522] to-[#ea7a38] hover:brightness-105 shadow-sm transition-all cursor-pointer"
              >
                Recarregar Portal do Simpósio
              </button>
              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full py-2 px-4 rounded-xl font-medium text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-all cursor-pointer"
              >
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
