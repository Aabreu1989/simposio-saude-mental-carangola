/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ExternalLink,
  FileText,
  Building2,
  Calendar,
  Eye,
  Check,
  Loader2,
  AlertCircle,
  Archive,
  ArrowDownToLine,
  Cloud,
  Share2,
  Copy
} from 'lucide-react';
import { DownloadMaterial } from '../types.ts';
import { fetchChunkedMaterialBlobUrl } from '../services/firebaseDb.ts';
import { triggerMaterialDownload } from '../utils/helpers.ts';

interface DocumentPreviewModalProps {
  material: DownloadMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  onIncrementDownload?: (id: string) => void;
}

export const getFileFormatDetails = (format?: string) => {
  const normalized = (format || 'PDF').toUpperCase().trim();
  if (normalized === 'DOCX' || normalized === 'DOC') {
    return {
      type: 'DOCX' as const,
      label: 'DOCX',
      title: 'Documento Word Editável',
      accentColor: '#1d4ed8',
      bgBadge: 'bg-blue-100 text-blue-800 border-blue-200',
      spineColor: 'bg-blue-600',
      iconContainer: 'bg-blue-50 text-blue-600 border-blue-200',
      isTextDoc: true
    };
  }
  if (normalized === 'ZIP' || normalized === 'RAR') {
    return {
      type: 'ZIP' as const,
      label: 'ZIP',
      title: 'Pacote Comprimido de Arquivos',
      accentColor: '#d97706',
      bgBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      spineColor: 'bg-amber-500',
      iconContainer: 'bg-amber-50 text-amber-600 border-amber-200',
      isTextDoc: false
    };
  }
  return {
    type: 'PDF' as const,
    label: 'PDF',
    title: 'Documento Portátil Oficial (PDF)',
    accentColor: '#e11d48',
    bgBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    spineColor: 'bg-rose-600',
    iconContainer: 'bg-rose-50 text-rose-600 border-rose-200',
    isTextDoc: false
  };
};

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  material,
  isOpen,
  onClose,
  onIncrementDownload
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'details'>('preview');
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Close on ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Resolve previewable URL when modal opens
  useEffect(() => {
    let isCancelled = false;
    let createdBlobUrl: string | null = null;

    if (!isOpen || !material) {
      setResolvedUrl(null);
      setIsResolving(false);
      setResolveError(null);
      return;
    }

    const resolve = async () => {
      setIsResolving(true);
      setResolveError(null);

      try {
        // 1. Chunked PDF stored in Firebase Firestore
        if (material.fileUrl && material.fileUrl.startsWith('firestore-chunked://')) {
          const targetId = material.fileUrl.replace('firestore-chunked://', '') || material.id;
          const blobUrl = await fetchChunkedMaterialBlobUrl(targetId, material.mimeType || 'application/pdf');
          if (!isCancelled) {
            createdBlobUrl = blobUrl;
            setResolvedUrl(blobUrl);
          }
          return;
        }

        // 2. Schedule PDF special generator (mat-0)
        if (
          material.id === 'mat-0' ||
          material.title.toLowerCase().includes('grade horária') ||
          material.title.toLowerCase().includes('programação completa')
        ) {
          if (!isCancelled) {
            setResolvedUrl('/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg');
          }
          return;
        }

        // 3. Direct URL or data URL
        if (
          material.fileUrl &&
          (material.fileUrl.startsWith('data:') ||
            material.fileUrl.startsWith('blob:') ||
            material.fileUrl.startsWith('http') ||
            material.fileUrl.startsWith('/'))
        ) {
          if (!isCancelled) {
            setResolvedUrl(material.fileUrl);
          }
          return;
        }

        // 4. Fallback text or placeholder
        if (!isCancelled) {
          setResolvedUrl(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Erro ao carregar pré-visualização do material:', err);
          setResolveError('Não foi possível carregar a pré-visualização completa em tela. Você ainda pode baixar o arquivo.');
          setResolvedUrl(null);
        }
      } finally {
        if (!isCancelled) {
          setIsResolving(false);
        }
      }
    };

    resolve();

    return () => {
      isCancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, material]);

  if (!isOpen || !material) return null;

  const formatInfo = getFileFormatDetails(material.format);
  const isPdf = formatInfo.type === 'PDF';
  const isDocx = formatInfo.type === 'DOCX';
  const isZip = formatInfo.type === 'ZIP';
  const isCloudPersisted =
    material.fileUrl?.startsWith('firestore-chunked://') ||
    Boolean(material.chunkCount && material.chunkCount > 0);

  const handleDownloadAction = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    if (onIncrementDownload) {
      onIncrementDownload(material.id);
    }
    try {
      await triggerMaterialDownload(material);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Falha ao baixar:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/#downloads`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenInNewTab = () => {
    if (resolvedUrl) {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    } else {
      handleDownloadAction();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0a3641] text-white flex items-center justify-between gap-3 border-b border-[#0f4b59]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Format Icon */}
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isPdf
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                : isDocx
                ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
            }`}>
              {isZip ? (
                <Archive className="w-5 h-5 text-amber-400" />
              ) : (
                <FileText className={`w-5 h-5 ${isDocx ? 'text-blue-400' : 'text-rose-400'}`} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className={`inline-flex items-center gap-1 font-mono font-black text-[9px] sm:text-[10px] px-2 py-0.2 rounded border uppercase tracking-wider ${
                  isPdf
                    ? 'bg-rose-900/60 text-rose-200 border-rose-500/40'
                    : isDocx
                    ? 'bg-blue-900/60 text-blue-200 border-blue-500/40'
                    : 'bg-amber-900/60 text-amber-200 border-amber-500/40'
                }`}>
                  {formatInfo.label}
                </span>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-teal-900/60 text-teal-200 border border-teal-500/30">
                  {material.category}
                </span>

                {isCloudPersisted && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Nuvem SUS</span>
                  </span>
                )}
              </div>

              <h2
                id="document-preview-title"
                className="text-sm sm:text-base font-bold text-white leading-tight truncate pr-2"
                title={material.title}
              >
                {material.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Abrir documento em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#ea7a38]" />
              <span>Abertura Rápida</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Fechar pré-visualização"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab & Info Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#0a3641] text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-[#ea7a38]" />
              <span>Pré-visualização</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-[#0a3641] text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha Técnica & Resumo</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-stone-500 font-mono text-[11px]">
            <span>{material.size}</span>
            <span>•</span>
            <span>{material.pages} págs</span>
            <span>•</span>
            <span>{material.downloadsCount} downloads</span>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#faf8f5]">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* PDF Preview View */}
              {isPdf ? (
                <div className="space-y-3">
                  {isResolving ? (
                    <div className="h-[460px] sm:h-[520px] rounded-2xl bg-white border border-stone-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#ea7a38]" />
                      <div className="text-sm font-bold text-[#0a3641]">
                        Carregando documento técnico...
                      </div>
                      <div className="text-xs text-stone-500 max-w-sm">
                        Processando dados em nuvem para abertura rápida no seu dispositivo.
                      </div>
                    </div>
                  ) : resolvedUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-stone-600 bg-white px-3.5 py-2 rounded-xl border border-stone-200">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Eye className="w-3.5 h-3.5 text-[#ea7a38]" />
                          <span>Visualizador Integrado de PDF · Simpósio SUS Carangola</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenInNewTab}
                          className="font-bold text-[#0a3641] hover:text-[#ea7a38] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Tela Cheia</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="h-[460px] sm:h-[520px] rounded-2xl overflow-hidden border border-stone-300 shadow-sm bg-stone-900">
                        <iframe
                          src={`${resolvedUrl}#view=FitH&toolbar=1`}
                          title={`Pré-visualização de ${material.title}`}
                          className="w-full h-full border-0"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Fallback when PDF cannot be embedded (e.g. strict CSP or placeholder) */
                    <div className="rounded-2xl bg-white p-6 sm:p-8 border border-stone-200 text-center space-y-4 shadow-xs">
                      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[#0a3641]">
                          {material.title}
                        </h3>
                        <p className="text-xs text-stone-500 font-mono">
                          Formato Oficial: PDF ({material.size}) · {material.pages} páginas
                        </p>
                      </div>
                      <p className="text-xs text-stone-600 max-w-xl mx-auto leading-relaxed">
                        {material.description}
                      </p>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleDownloadAction}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0a3641] hover:bg-[#0f4b59] active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Baixando PDF...</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownToLine className="w-4 h-4 text-[#ea7a38]" />
                              <span>Baixar PDF Completo</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenInNewTab}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir em Nova Janela</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isDocx ? (
                /* DOCX Specialized Document Preview Card */
                <div className="rounded-2xl bg-white p-6 sm:p-8 border-2 border-blue-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                        <span>Documento Microsoft Word (.docx)</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                        {material.title}
                      </h3>
                      <p className="text-xs text-stone-500 font-mono">
                        {material.author} · {material.size} · Aprox. {material.pages} páginas
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-950 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-blue-900">
                      <span>Orientações de Utilização do Formato DOCX:</span>
                    </div>
                    <p className="text-blue-900/90 leading-relaxed">
                      Este documento é um modelo oficial editável disponibilizado para as equipes de saúde. Você pode preenchê-lo diretamente no Microsoft Word, Google Docs ou LibreOffice Writer.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                      Resumo do Conteúdo:
                    </div>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200">
                      {material.description}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={handleDownloadAction}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Baixando DOCX...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="w-4 h-4 text-sky-300" />
                          <span>Baixar Arquivo DOCX</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ZIP / Other Archive Card */
                <div className="rounded-2xl bg-white p-6 sm:p-8 border-2 border-amber-200 shadow-sm space-y-5 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                      <Archive className="w-8 h-8 text-amber-600" />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                        <span>Arquivo Comprimido (.zip)</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                        {material.title}
                      </h3>
                      <p className="text-xs text-stone-500 font-mono">
                        {material.author} · {material.size}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200">
                    {material.description}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={handleDownloadAction}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-700 hover:bg-amber-800 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      <ArrowDownToLine className="w-4 h-4 text-amber-200" />
                      <span>Baixar Pacote ZIP ({material.size})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Ficha Técnica & Resumo Tab */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#ea7a38] block mb-1">
                    Ficha Catalográfica & Metadados Oficiais
                  </span>
                  <h3 className="text-lg font-bold text-[#0a3641] leading-snug">
                    {material.title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block mb-1">
                      Categoria / Pasta
                    </span>
                    <span className="font-bold text-stone-900">{material.category}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block mb-1">
                      Formato do Arquivo
                    </span>
                    <span className="font-mono font-bold text-stone-900">{formatInfo.label} ({material.size})</span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block mb-1">
                      Volume / Extensão
                    </span>
                    <span className="font-mono font-bold text-stone-900">{material.pages} páginas estimadas</span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 sm:col-span-2">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>Órgão / Autoria Técnica</span>
                    </span>
                    <span className="font-medium text-stone-900 leading-snug">{material.author}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Território</span>
                    </span>
                    <span className="font-medium text-stone-900">SUS Microrregião de Carangola/MG</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">
                    Resumo Descritivo & Diretrizes da RAPS
                  </span>
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                    {material.description}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold transition-all cursor-pointer"
              title="Copiar link da área de downloads"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Compartilhar</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleDownloadAction}
              disabled={isDownloading}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-60 active:scale-95 ${
                downloadSuccess ? 'bg-emerald-600' : 'bg-[#0a3641] hover:bg-[#0f4b59]'
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Baixando...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Download Concluído!</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-3.5 h-3.5 text-[#ea7a38]" />
                  <span>Baixar {formatInfo.label}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
