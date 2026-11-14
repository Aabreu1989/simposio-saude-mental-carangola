import React, { useState } from 'react';
import { Shield, Lock, User, KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToPublic: () => void;
  editionTitle?: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToPublic,
  editionTitle = '1º Simpósio de Saúde Mental da Microrregião de Carangola'
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const expectedUser = 'SIMPOSIO CARANGOLA';
    const expectedPass = 'SUS2026%';

    if (!username.trim() || !password) {
      setErrorMessage('Por favor, preencha o usuário e a senha.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (cleanUsername === expectedUser && password === expectedPass) {
        setIsSuccess(true);
        setIsLoading(false);
        try {
          localStorage.removeItem('simposio_admin_logged_out');
          localStorage.setItem('simposio_admin_auth', 'true');
          sessionStorage.setItem('simposio_admin_auth', 'true');
        } catch {
          // ignore storage errors
        }
        setTimeout(() => {
          onLoginSuccess();
        }, 400);
      } else {
        setIsLoading(false);
        if (cleanUsername !== expectedUser) {
          setErrorMessage('Acesso restrito: Apenas o Gestor Titular do Simpósio ("SIMPOSIO CARANGOLA") possui credenciamento para este painel.');
        } else {
          setErrorMessage('Senha incorreta para o Gestor Titular ("SUS2026%").');
        }
      }
    }, 350);
  };

  const handleFillCredentials = () => {
    setUsername('SIMPOSIO CARANGOLA');
    setPassword('SUS2026%');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-[#faf8f5] via-stone-100 to-[#eef4f6]">
      {/* Back button */}
      <div className="w-full max-w-md mb-4">
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#0a3641] transition-colors p-1.5 rounded-lg hover:bg-white/60 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#ea7a38]" />
          <span>Voltar ao Portal Público do Simpósio</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0a3641] px-6 py-8 text-white relative overflow-hidden border-b-4 border-[#ea7a38]">
            {/* Background geometric accents */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-12 -bottom-10 w-24 h-24 rounded-full bg-[#ea7a38]/15 pointer-events-none" />

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a3641] via-[#028090] to-[#ea7a38] p-[2px] shadow-sm shrink-0">
                <div className="w-full h-full bg-[#0a3641] rounded-[14px] flex items-center justify-center text-white font-black text-xs tracking-tight">
                  SUS
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-[#ea7a38] uppercase tracking-wider block">
                  Carangola · Zona da Mata MG
                </span>
                <h1 className="text-sm font-extrabold text-white leading-tight">
                  Painel de Gestão Microrregional
                </h1>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#ea7a38] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-snug">
                  Autenticação Administrativa
                </h2>
                <p className="text-xs text-stone-300">
                  Insira as credenciais oficiais para gerenciar o Simpósio
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="font-semibold">{errorMessage}</div>
              </div>
            )}

            {/* Success Banner */}
            {isSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="font-semibold">Autenticado com sucesso! Carregando painel...</div>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-black uppercase tracking-wider text-[#0a3641] mb-1.5"
              >
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="SIMPOSIO CARANGOLA"
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a3641] focus:border-transparent transition-all placeholder:text-stone-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Identificação do gestor da comissão organizadora
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-black uppercase tracking-wider text-[#0a3641] mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a3641] focus:border-transparent transition-all placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Senha institucional de segurança
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm uppercase tracking-wider bg-gradient-to-r from-[#0a3641] via-[#028090] to-[#0a3641] hover:brightness-110 active:scale-98 transition-all shadow-md shadow-[#0a3641]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Acesso Concedido</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-[#ea7a38]" />
                  <span>Acessar Painel do Gestor</span>
                </>
              )}
            </button>

            {/* Quick Fill for Authorized Manager */}
            <div className="p-3 bg-stone-50 border border-stone-200/90 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#0a3641] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#ea7a38]" />
                  Gestor Titular Único Autorizado:
                </span>
                <button
                  type="button"
                  onClick={handleFillCredentials}
                  className="font-bold text-xs text-[#d96522] hover:text-[#0a3641] underline cursor-pointer"
                >
                  Preencher Credenciais
                </button>
              </div>
              <div className="text-[10px] text-stone-500">
                Apenas a conta de coordenação (<span className="font-mono font-bold text-stone-700">SIMPOSIO CARANGOLA</span>) possui permissão de gestão no sistema.
              </div>
            </div>

            {/* Institutional Security Notice */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#ea7a38]" />
                SUS · RAPS Microrregional
              </span>
              <span className="font-mono text-stone-400">Credenciamento Ativo</span>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <p className="mt-4 text-center text-xs text-stone-500">
          Problemas de acesso? Contate a comissão gestora da Saúde Mental de Carangola.
        </p>
      </div>
    </div>
  );
};
