/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Search,
  RefreshCw,
  Star,
  CheckCircle2,
  Trash2,
  Archive,
  Inbox,
  AlertCircle,
  ExternalLink,
  Bot,
  Zap,
  Users,
  Clock,
  Check,
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck,
  UserCheck,
  ArrowLeft
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logoutGoogle
} from '../services/gmailAuth.ts';
import {
  GmailMessageSummary,
  AutomatedWorkflow,
  DEFAULT_GMAIL_WORKFLOWS,
  listGmailMessages,
  sendGmailMessage,
  modifyMessageLabels,
  archiveGmailMessage,
  trashGmailMessage
} from '../services/gmailService.ts';
import { Registration, EventConfig } from '../types.ts';

interface GmailNotificationHubProps {
  registrations: Registration[];
  config: EventConfig;
  isDarkMode?: boolean;
}

export const GmailNotificationHub: React.FC<GmailNotificationHubProps> = ({
  registrations,
  config
}) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sub-tabs in Gmail hub
  const [activeSubTab, setActiveSubTab] = useState<'workflows' | 'inbox' | 'compose'>('workflows');

  // Messages list state
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred'>('all');

  // Compose / Broadcast state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'custom' | 'todos' | 'confirmados' | 'presentes'>('todos');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  // Workflows state
  const [workflows, setWorkflows] = useState<AutomatedWorkflow[]>(() => {
    try {
      const saved = localStorage.getItem('sus_gmail_workflows');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GMAIL_WORKFLOWS;
  });
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [workflowLog, setWorkflowLog] = useState<Array<{ id: string; text: string; time: string; type: 'success' | 'info' | 'warn' }>>([]);

  // Confirmation Modal state for Workspace Mutating / Destructive Operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    isDestructive: false,
    onConfirm: async () => {}
  });

  // Track auth state on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch messages when authenticated and inbox tab is opened
  useEffect(() => {
    if (token && activeSubTab === 'inbox') {
      fetchMessages();
    }
  }, [token, activeSubTab]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        addLog(`Conexão autorizada com sucesso via Google Workspace (${res.user.email}).`, 'success');
      } else {
        // User closed or dismissed the popup window
        addLog('Autenticação com Google cancelada. Clique novamente para conectar.', 'info');
      }
    } catch (err: any) {
      const isPopupClosed =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user');

      if (!isPopupClosed) {
        console.warn('Aviso de conexão Google:', err?.message || err);
        setAuthError(err.message || 'Falha ao autenticar com Google. Certifique-se de permitir o pop-up.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setMessages([]);
    setSelectedMessage(null);
    addLog('Sessão do Gmail desconectada.', 'info');
  };

  const addLog = (text: string, type: 'success' | 'info' | 'warn' = 'info') => {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      time: new Date().toLocaleTimeString('pt-BR'),
      type
    };
    setWorkflowLog((prev) => [entry, ...prev.slice(0, 49)]);
  };

  const fetchMessages = async (query = searchQuery) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) return;

    setIsLoadingMessages(true);
    try {
      const q = query ? `${query}` : '';
      const data = await listGmailMessages(currentToken, { q: q.trim() || undefined, maxResults: 15 });
      setMessages(data.messages);
      if (data.messages.length > 0 && !selectedMessage && window.innerWidth >= 1024) {
        setSelectedMessage(data.messages[0]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar mensagens:', err);
      addLog(`Erro ao consultar caixa postal do Gmail: ${err.message}`, 'warn');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Organize Actions
  const handleToggleStar = async (msg: GmailMessageSummary) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) return;

    try {
      const willStar = !msg.isStarred;
      await modifyMessageLabels(
        currentToken,
        msg.id,
        willStar ? ['STARRED'] : [],
        willStar ? [] : ['STARRED']
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isStarred: willStar } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage((prev) => (prev ? { ...prev, isStarred: willStar } : null));
      }
      addLog(`Mensagem "${msg.subject}" ${willStar ? 'marcada com estrela' : 'estrela removida'}.`, 'info');
    } catch (err: any) {
      alert(`Falha ao alterar marcador: ${err.message}`);
    }
  };

  const handleToggleRead = async (msg: GmailMessageSummary) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) return;

    try {
      const willUnread = !msg.isUnread;
      await modifyMessageLabels(
        currentToken,
        msg.id,
        willUnread ? ['UNREAD'] : [],
        willUnread ? [] : ['UNREAD']
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isUnread: willUnread } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage((prev) => (prev ? { ...prev, isUnread: willUnread } : null));
      }
      addLog(`Mensagem "${msg.subject}" marcada como ${willUnread ? 'não lida' : 'lida'}.`, 'info');
    } catch (err: any) {
      alert(`Falha ao alterar estado de leitura: ${err.message}`);
    }
  };

  const handleArchive = async (msg: GmailMessageSummary) => {
    setConfirmModal({
      isOpen: true,
      title: 'Arquivar E-mail no Gmail',
      description: `Tem certeza de que deseja arquivar a mensagem "${msg.subject}"? Ela sairá da Caixa de Entrada mas continuará acessível em 'Todos os e-mails'.`,
      confirmText: 'Arquivar Mensagem',
      isDestructive: false,
      onConfirm: async () => {
        const currentToken = token || (await getAccessToken());
        if (!currentToken) return;
        await archiveGmailMessage(currentToken, msg.id);
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        if (selectedMessage?.id === msg.id) setSelectedMessage(null);
        addLog(`E-mail "${msg.subject}" arquivado com sucesso no Gmail.`, 'success');
      }
    });
  };

  const handleTrash = async (msg: GmailMessageSummary) => {
    setConfirmModal({
      isOpen: true,
      title: 'Mover E-mail para a Lixeira?',
      description: `Atenção: A mensagem de "${msg.from}" com o assunto "${msg.subject}" será movida para a Lixeira da conta farmaciademinas.marketing@gmail.com.`,
      confirmText: 'Excluir / Mover para Lixeira',
      isDestructive: true,
      onConfirm: async () => {
        const currentToken = token || (await getAccessToken());
        if (!currentToken) return;
        await trashGmailMessage(currentToken, msg.id);
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        if (selectedMessage?.id === msg.id) setSelectedMessage(null);
        addLog(`E-mail "${msg.subject}" movido para a Lixeira do Gmail.`, 'warn');
      }
    });
  };

  // SEND & BROADCAST WORKFLOWS
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim()) return;

    let recipients: string[] = [];

    if (broadcastAudience === 'custom') {
      if (!composeTo.trim()) {
        alert('Por favor, informe o e-mail de destino.');
        return;
      }
      recipients = composeTo.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (broadcastAudience === 'confirmados') {
      recipients = registrations
        .filter((r) => r.status === 'confirmada' || r.status === 'presente')
        .map((r) => r.email);
    } else if (broadcastAudience === 'presentes') {
      recipients = registrations
        .filter((r) => r.status === 'presente')
        .map((r) => r.email);
    } else {
      recipients = registrations.map((r) => r.email);
    }

    if (recipients.length === 0) {
      alert('Nenhum destinatário encontrado para o público selecionado.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Confirmar Disparo de ${recipients.length} E-mail(s) Oficial(is)`,
      description: `Você está prestes a disparar ${recipients.length} mensagem(ns) oficial(is) através do Gmail da conta farmaciademinas.marketing@gmail.com com o assunto "${composeSubject}". Os participantes receberão a mensagem em suas caixas postais. Deseja prosseguir com o envio?`,
      confirmText: `Disparar para ${recipients.length} Destinatário(s)`,
      isDestructive: false,
      onConfirm: async () => {
        await executeBroadcast(recipients, composeSubject, composeBody);
      }
    });
  };

  const executeBroadcast = async (recipients: string[], subject: string, bodyTemplate: string) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      alert('Sessão expirada. Por favor, conecte-se com sua conta Google novamente.');
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const email = recipients[i];
      const matchedAttendee = registrations.find((r) => r.email.toLowerCase() === email.toLowerCase());

      const personalizedBody = bodyTemplate
        .replace(/{nome}/g, matchedAttendee ? matchedAttendee.fullName : 'Participante')
        .replace(/{codigo}/g, matchedAttendee ? matchedAttendee.code : 'SUS-2026')
        .replace(/{cidade}/g, matchedAttendee ? matchedAttendee.city : 'Carangola')
        .replace(/{eixo}/g, matchedAttendee ? matchedAttendee.axisInterest : 'Saúde Mental na Atenção Básica');

      try {
        await sendGmailMessage(currentToken, {
          to: email,
          subject,
          bodyText: personalizedBody
        });
        successCount++;
      } catch (err: any) {
        console.error(`Falha ao enviar para ${email}:`, err);
        failCount++;
      }

      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    setIsSending(false);
    setSendSuccessNotice(`Disparo concluído: ${successCount} e-mails enviados com sucesso pelo Gmail!${failCount > 0 ? ` (${failCount} falhas)` : ''}`);
    addLog(`Campanha disparada via farmaciademinas.marketing@gmail.com: ${successCount} enviados (${subject}).`, 'success');

    setTimeout(() => setSendSuccessNotice(null), 5000);
    setComposeSubject('');
    setComposeBody('');
    if (broadcastAudience === 'custom') setComposeTo('');
  };

  const handleExecuteWorkflow = async (wf: AutomatedWorkflow) => {
    let targetRecipients: string[] = [];
    if (wf.targetAudience === 'presentes') {
      targetRecipients = registrations.filter((r) => r.status === 'presente').map((r) => r.email);
    } else {
      targetRecipients = registrations.map((r) => r.email);
    }

    if (targetRecipients.length === 0) {
      alert('Nenhum participante elegível na base para este fluxo automático.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Executar Workflow: "${wf.title}"`,
      description: `Esta rotina irá gerar e transmitir e-mails oficiais personalizados via Gmail (farmaciademinas.marketing@gmail.com) para ${targetRecipients.length} participante(s). Assunto: "${wf.templateSubject}".`,
      confirmText: 'Executar Automação Agora',
      isDestructive: false,
      onConfirm: async () => {
        setRunningWorkflowId(wf.id);
        await executeBroadcast(targetRecipients, wf.templateSubject, wf.templateBody);
        
        setWorkflows((prev) => {
          const updated = prev.map((w) =>
            w.id === wf.id ? { ...w, executionsCount: w.executionsCount + targetRecipients.length, lastRun: new Date().toISOString() } : w
          );
          try {
            localStorage.setItem('sus_gmail_workflows', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        setRunningWorkflowId(null);
      }
    });
  };

  const handleToggleWorkflowEnabled = (id: string) => {
    setWorkflows((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
      try {
        localStorage.setItem('sus_gmail_workflows', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const filteredMessages = messages.filter((m) => {
    if (filterType === 'unread') return m.isUnread;
    if (filterType === 'starred') return m.isStarred;
    return true;
  });

  return (
    <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xs transition-all">
      
      {/* Header Bar (Responsive for all screens) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold font-mono uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-rose-500" />
              <span>Gmail Oficial · Google Workspace</span>
            </span>
            <span className="text-[11px] font-mono text-stone-600 truncate font-semibold">
              farmaciademinas.marketing@gmail.com
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#0a3641] flex items-center gap-2">
            <span>Automação & Gerenciador Programático de E-mails</span>
            <Sparkles className="w-4 h-4 text-[#ea7a38] shrink-0" />
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Envio programático, leitura, busca e organização de e-mails com a conta oficial do evento, automatizando lembretes, confirmações e certificados para os participantes.
          </p>
        </div>

        {/* Auth Action / Google Button (Responsive) */}
        <div className="shrink-0 flex items-center">
          {token && user ? (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 border border-stone-200 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {user.email?.charAt(0).toUpperCase() || 'G'}
                </div>
                <div className="text-left text-xs leading-tight min-w-0">
                  <div className="font-bold flex items-center gap-1 text-emerald-600 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Conectado</span>
                  </div>
                  <div className="font-mono text-[11px] text-stone-700 truncate max-w-[190px]" title={user.email || 'farmaciademinas.marketing@gmail.com'}>
                    {user.email || 'farmaciademinas.marketing@gmail.com'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-200 transition-colors cursor-pointer shrink-0"
                title="Desconectar conta do Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span className="truncate">{isLoggingIn ? 'Conectando ao Google...' : 'Conectar com farmaciademinas.marketing@gmail.com'}</span>
              </button>
              <div className="flex flex-col sm:items-end text-[10px] text-stone-500 font-sans leading-tight">
                <span className="font-mono text-emerald-800 font-medium">Permissão oficial de envio e leitura (OAuth SUS)</span>
                <span className="text-[9.5px] text-stone-400 mt-0.5">
                  Se o Google exibir "App não verificado", clique em <strong>Avançado</strong> &gt; <strong>Acessar (não seguro)</strong> para prosseguir.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{authError}</span>
        </div>
      )}

      {sendSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{sendSuccessNotice}</span>
        </div>
      )}

      {/* Sub-Tabs: Touch-friendly horizontal scrollbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-stone-200 pb-2 overflow-x-auto scrollbar-none text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('workflows')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'workflows'
              ? 'bg-[#ea7a38] text-white shadow-2xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Workflows Automáticos ({workflows.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('compose')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'compose'
              ? 'bg-[#ea7a38] text-white shadow-2xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Disparador de Campanhas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'inbox'
              ? 'bg-[#ea7a38] text-white shadow-2xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Caixa de Entrada & Busca ({messages.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: WORKFLOWS AUTOMÁTICOS */}
      {activeSubTab === 'workflows' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="p-4 sm:p-5 rounded-2xl border border-stone-200/90 bg-stone-50/70 flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#ea7a38]/20 flex items-center justify-center text-[#ea7a38] shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 truncate">
                        <h4 className="text-sm font-bold text-stone-900 leading-tight truncate">{wf.title}</h4>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block">
                          Gatilho: {wf.triggerEvent} · Público: {wf.targetAudience}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleWorkflowEnabled(wf.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        wf.enabled ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                      title={wf.enabled ? 'Workflow ativado' : 'Workflow pausado'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          wf.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {wf.description}
                  </p>

                  <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
                    <div className="text-[10px] uppercase font-mono font-bold text-stone-400">Assunto:</div>
                    <div className="text-xs font-semibold text-stone-800 truncate">
                      {wf.templateSubject}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-stone-500">
                    <span className="font-bold text-stone-800">{wf.executionsCount}</span> disparos
                  </div>

                  <button
                    disabled={!token || runningWorkflowId === wf.id}
                    onClick={() => handleExecuteWorkflow(wf)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] active:scale-95 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                    title={!token ? 'Conecte com Google para disparar' : 'Executar rotina pelo Gmail'}
                  >
                    {runningWorkflowId === wf.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Disparando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-[#ea7a38]" />
                        <span>Disparar Agora</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow execution live log */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-stone-600">
                Log de Eventos & Automações do Gmail
              </span>
              <span className="text-[10px] font-mono text-stone-400">Tempo real</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
              {workflowLog.length === 0 ? (
                <div className="text-stone-400 text-[11px] py-2">Nenhum evento registrado ainda nesta sessão.</div>
              ) : (
                workflowLog.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 text-[11px]">
                    <span className="text-stone-400">[{l.time}]</span>
                    <span
                      className={
                        l.type === 'success'
                          ? 'text-emerald-600 font-semibold'
                          : l.type === 'warn'
                          ? 'text-amber-600'
                          : 'text-stone-700'
                      }
                    >
                      {l.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DISPARADOR / COMPOSE */}
      {activeSubTab === 'compose' && (
        <form onSubmit={handleInitiateSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-stone-700 font-mono">
                Público Destinatário *
              </label>
              <select
                value={broadcastAudience}
                onChange={(e) => setBroadcastAudience(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
              >
                <option value="todos">Todos os Participantes Inscritos ({registrations.length})</option>
                <option value="confirmados">Inscritos com Vaga Confirmada</option>
                <option value="presentes">Apenas Presentes / Credenciados</option>
                <option value="custom">Destinatário Personalizado / Individual</option>
              </select>
            </div>

            {broadcastAudience === 'custom' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-stone-700 font-mono">
                  E-mail do Destinatário *
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
                />
              </div>
            ) : (
              <div className="sm:col-span-2 flex items-center pt-2 sm:pt-5">
                <div className="text-xs text-stone-500 font-mono truncate">
                  Remetente: <strong className="text-rose-600">farmaciademinas.marketing@gmail.com</strong>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-stone-700 font-mono">
              Assunto Oficial do E-mail *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: [SUS Carangola] Informações Importantes sobre o Simpósio"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
                Corpo da Mensagem *
              </label>
              <div className="text-[11px] font-mono text-stone-400">
                Tags: <code className="text-[#ea7a38] font-bold">{'{nome}'}</code>, <code className="text-[#ea7a38] font-bold">{'{codigo}'}</code>, <code className="text-[#ea7a38] font-bold">{'{cidade}'}</code>
              </div>
            </div>
            <textarea
              rows={6}
              required
              placeholder="Prezado(a) {nome},&#10;&#10;Confirmamos os detalhes do 1º Simpósio de Saúde Mental da Microrregião de Carangola...&#10;&#10;Seu código de credenciamento é: {codigo}."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
            />
          </div>

          {/* Preset Buttons for Quick Emails */}
          <div>
            <span className="text-[11px] font-mono uppercase text-stone-500 block mb-1.5 font-bold">
              Modelos Rápidos:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setComposeSubject('Lembrete de Véspera: Simpósio de Saúde Mental Carangola amanhã às 08h30');
                  setComposeBody('Olá {nome},\n\nLembramos que o 1º Simpósio de Saúde Mental da Microrregião de Carangola acontecerá amanhã!\n\nLocal: UEMG Carangola (Praça Cel. Maximiano, 180 - Centro, Carangola - MG)\nHorário de credenciamento: 08h30\nSeu código de identificação: {codigo}\n\nEsperamos você para um dia produtivo de debates em prol da RAPS regional.\n\nComissão Organizadora do SUS');
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 cursor-pointer"
              >
                Lembrete Véspera
              </button>

              <button
                type="button"
                onClick={() => {
                  setComposeSubject('Seu Certificado Oficial do 1º Simpósio de Saúde Mental está Liberado!');
                  setComposeBody('Prezado(a) {nome},\n\nAgradecemos imensamente por sua presença no 1º Simpósio de Saúde Mental da Microrregião de Carangola.\n\nSeu certificado de participação (8 horas) já se encontra autenticado pelo SUS. Para emiti-lo, acesse o portal do evento e informe seu CPF ou código {codigo}.\n\nAtenciosamente,\nSecretaria Municipal de Saúde de Carangola');
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 cursor-pointer"
              >
                Aviso de Certificado
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-stone-500">
              Disparo seguro através de farmaciademinas.marketing@gmail.com com confirmação prévia.
            </span>

            <button
              type="submit"
              disabled={isSending || !token}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transmitindo pelo Gmail...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Revisar & Disparar E-mails</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: CAIXA DE ENTRADA, BUSCA & ORGANIZAÇÃO (100% RESPONSIVE) */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-4">
          
          {/* Search and Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por remetente, assunto, 'Simpósio'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMessages(searchQuery)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchMessages(searchQuery)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer shrink-0"
                title="Executar busca"
              >
                Buscar
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  filterType === 'all' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                Todos
              </button>

              <button
                onClick={() => setFilterType('unread')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  filterType === 'unread' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                Não Lidos
              </button>

              <button
                onClick={() => setFilterType('starred')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  filterType === 'starred' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                Com Estrela
              </button>

              <button
                onClick={() => fetchMessages(searchQuery)}
                disabled={isLoadingMessages}
                className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer shrink-0"
                title="Atualizar caixa postal"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {!token ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 space-y-3">
              <Mail className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="text-sm font-bold text-stone-900">Conecte sua conta do Gmail para ver os e-mails</div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Ao conectar, você poderá visualizar e responder mensagens de participantes de farmaciademinas.marketing@gmail.com.
              </p>
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs cursor-pointer"
              >
                Conectar com Google
              </button>
            </div>
          ) : isLoadingMessages ? (
            <div className="p-12 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
              <span>Sincronizando mensagens com o Gmail...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-stone-200 text-stone-500 space-y-1">
              <Inbox className="w-8 h-8 mx-auto opacity-50" />
              <div className="text-xs font-bold">Nenhum e-mail correspondente encontrado</div>
              <p className="text-[11px]">Tente atualizar ou limpar a busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Message List Strip (Hidden on mobile if a message is open) */}
              <div className={`lg:col-span-5 divide-y divide-stone-200 border border-stone-200 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto ${
                selectedMessage ? 'hidden lg:block' : 'block'
              }`}>
                {filteredMessages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`p-3.5 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-rose-50/70 border-l-4 border-rose-500'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(msg);
                            }}
                            className="text-stone-400 hover:text-amber-400 cursor-pointer"
                          >
                            <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <span className={`text-xs truncate ${msg.isUnread ? 'font-black text-rose-600' : 'font-semibold text-stone-800'}`}>
                            {msg.from.replace(/<.*>/, '').trim()}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                          {new Date(msg.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>

                      <div className={`text-xs line-clamp-1 ${msg.isUnread ? 'font-bold text-stone-900' : 'text-stone-700'}`}>
                        {msg.subject}
                      </div>

                      <div className="text-[11px] text-stone-500 line-clamp-1">
                        {msg.snippet}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Details Pane (Full screen on mobile when open) */}
              <div className={`lg:col-span-7 rounded-2xl border border-stone-200 p-4 sm:p-5 flex flex-col justify-between space-y-4 min-h-[380px] bg-stone-50/60 ${
                selectedMessage ? 'block' : 'hidden lg:flex'
              }`}>
                {selectedMessage ? (
                  <>
                    <div className="space-y-4">
                      {/* Top Action Bar for mobile back & organizing */}
                      <div className="flex items-center justify-between border-b border-stone-200 pb-3 gap-2">
                        <div className="flex items-center gap-2">
                          {/* Mobile Back Button */}
                          <button
                            onClick={() => setSelectedMessage(null)}
                            className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-lg shadow-2xs"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Voltar</span>
                          </button>

                          <button
                            onClick={() => handleToggleStar(selectedMessage)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 bg-white cursor-pointer"
                            title={selectedMessage.isStarred ? 'Remover estrela' : 'Adicionar estrela'}
                          >
                            <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => handleToggleRead(selectedMessage)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 bg-white cursor-pointer"
                          >
                            {selectedMessage.isUnread ? 'Marcar Lido' : 'Não Lido'}
                          </button>

                          <button
                            onClick={() => handleArchive(selectedMessage)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 bg-white cursor-pointer"
                            title="Arquivar no Gmail"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleTrash(selectedMessage)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 bg-white cursor-pointer"
                          title="Excluir mensagem (Mover para Lixeira)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subject & Meta */}
                      <div>
                        <h4 className="text-base font-bold text-stone-900 leading-tight">
                          {selectedMessage.subject}
                        </h4>
                        <div className="text-xs text-stone-600 font-mono mt-1 space-y-0.5">
                          <div className="truncate"><strong>De:</strong> {selectedMessage.from}</div>
                          {selectedMessage.to && <div className="truncate"><strong>Para:</strong> {selectedMessage.to}</div>}
                          <div><strong>Data:</strong> {new Date(selectedMessage.date).toLocaleString('pt-BR')}</div>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-line">
                        {selectedMessage.bodyText || selectedMessage.snippet}
                      </div>
                    </div>

                    {/* Quick Reply Button */}
                    <div className="pt-3 border-t border-stone-200">
                      <button
                        onClick={() => {
                          setActiveSubTab('compose');
                          setBroadcastAudience('custom');
                          const match = selectedMessage.from.match(/<([^>]+)>/) || [null, selectedMessage.from];
                          setComposeTo(match[1] || selectedMessage.from);
                          setComposeSubject(`Re: ${selectedMessage.subject.replace(/^Re:\s*/i, '')}`);
                          setComposeBody(`\n\n--- Em resposta à mensagem recebida no Gmail ---\n${selectedMessage.snippet}`);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5 text-[#ea7a38]" />
                        <span>Responder pelo Gmail</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="m-auto text-center text-xs text-stone-400 py-8">
                    Selecione uma mensagem da lista ao lado para ler os detalhes.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR WORKSPACE MUTATING/DESTRUCTIVE OPERATIONS */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.isDestructive
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}>
                {confirmModal.isDestructive ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-stone-900 leading-tight truncate">{confirmModal.title}</h3>
                <span className="text-[10px] uppercase font-mono font-bold text-stone-400">
                  Confirmação Obrigatória
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  await confirmModal.onConfirm();
                }}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-[#0a3641] hover:bg-[#0f4b59]'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
