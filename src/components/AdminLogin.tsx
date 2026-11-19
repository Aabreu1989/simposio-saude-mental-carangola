import React, { useState } from 'react';
import { Shield, Lock, User, KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Cloud } from 'lucide-react';
import { sha256Hex } from '../services/firebaseDb.ts';

const ADMIN_PASSWORD_SHA256 = '949919aadc7d9deec65baee3b8062415c26508f5a705aa420e534ebe1cd23c0f';

interface AdminLoginProps {
  onLoginSuccess: (rememberMe: boolean) => void;
  onBackToPublic: () => void;
  editionTitle?: string;
  onGoogleAdminLogin?: (options?: { preferRedirect?: boolean }) => Promise<boolean>;
  googleAuthError?: string | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToPublic,
  editionTitle = '1º Simpósio de Saúde Mental da Microrregião de Carangola',
  onGoogleAdminLogin,
  googleAuthError
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawInput = username.trim();
    const cleanUsername = rawInput
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const isMatchUser =
      cleanUsername === 'SIMPOSIO CARANGOLA' ||
      cleanUsername === 'SIMPOSIOCARANGOLA' ||
      rawInput.toLowerCase() === 'farmaciademinas.marketing@gmail.com';

    if (!rawInput || !password) {
      setErrorMessage('Por favor, informe o usuário e a senha de gestor.');
      return;
    }

    setIsLoading(true);
    const passHash = await sha256Hex(password);
    const isMatchPass = passHash === ADMIN_PASSWORD_SHA256;

    setTimeout(() => {
      if (isMatchUser && isMatchPass) {
        setIsSuccess(true);
        setIsLoading(false);
        try {
          sessionStorage.setItem('simposio_admin_auth', 'true');
          if (rememberMe) {
            localStorage.setItem('simposio_admin_remember', 'true');
            localStorage.setItem('simposio_admin_auth', 'true');
          } else {
            localStorage.removeItem('simposio_admin_remember');
            localStorage.removeItem('simposio_admin_auth');
          }
          localStorage.removeItem('simposio_admin_logged_out');
        } catch {
          // ignore storage errors
        }
        setTimeout(() => {
          onLoginSuccess(rememberMe);
        }, 350);
      } else {
        setIsLoading(false);
        setErrorMessage('Credenciais incorretas. Verifique seu usuário e senha de gestor autorizado.');
      }
    }, 350);
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
                  Painel de Gestão do Simpósio
                </h1>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#ea7a38] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-snug">
                  Acesso Restrito ao Gestor
                </h2>
                <p className="text-xs text-stone-300">
                  Informe suas credenciais para gerenciar a plataforma
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Error Banner */}
            {(errorMessage || googleAuthError) && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="font-semibold">{errorMessage || googleAuthError}</div>
              </div>
            )}

            {/* 1-Click Official Google Auth (Syncs Panel + Firestore Inscritos Immediately) */}
            {onGoogleAdminLogin && (
              <div className="space-y-2 pb-1">
                <button
                  type="button"
                  disabled={isGoogleLoading || isLoading || isSuccess}
                  onClick={async () => {
                    setErrorMessage(null);
                    setIsGoogleLoading(true);
                    try {
                      await onGoogleAdminLogin();
                    } finally {
                      setIsGoogleLoading(false);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl border-2 border-[#028090]/35 bg-[#f2fbfb] hover:bg-[#e2f5f6] text-[#0a3641] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0a3641]/30 border-t-[#0a3641] rounded-full animate-spin" />
                      <span>Conectando conta Google oficial...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 text-[#028090] shrink-0" />
                      <span>Entrar com Google Oficial (Sincroniza Inscritos)</span>
                    </>
                  )}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    disabled={isGoogleLoading || isLoading || isSuccess}
                    onClick={async () => {
                      setErrorMessage(null);
                      setIsGoogleLoading(true);
                      try {
                        await onGoogleAdminLogin({ preferRedirect: true });
                      } finally {
                        setIsGoogleLoading(false);
                      }
                    }}
                    className="text-[11px] font-semibold text-[#028090] hover:text-[#0a3641] underline underline-offset-2 cursor-pointer disabled:opacity-60"
                  >
                    Usando celular/PWA e o popup não abriu? Entrar via redirecionamento
                  </button>
                </div>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-stone-200" />
                  <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-wider text-stone-400">
                    ou entre com usuário e senha
                  </span>
                  <div className="flex-grow border-t border-stone-200" />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                Usuário ou E-mail
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
                  placeholder="Usuário ou e-mail cadastrado"
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
                Senha institucional de segurança do gestor
              </p>
            </div>

            {/* Option: Manter Conectado Neste Navegador */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <label htmlFor="remember-me" className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#0a3641] border-stone-300 focus:ring-[#0a3641] cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-900 block">
                    Manter conectado neste navegador
                  </span>
                  <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                    Selecione esta opção para não precisar digitar o usuário e senha novamente neste navegador.
                  </span>
                </div>
              </label>
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

            {/* Institutional Security Notice */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#ea7a38]" />
                SUS · RAPS Microrregional
              </span>
              <span className="font-mono text-stone-400">Acesso Restrito</span>
            </div>
          </form>
          </div>
        </div>

        {/* Footer Info */}
        <p className="mt-4 text-center text-xs text-stone-500">
          Problemas de acesso? Contate a comissão gestora da Saúde Mental de Carangola.
        </p>
      </div>
    </div>
  );
};
