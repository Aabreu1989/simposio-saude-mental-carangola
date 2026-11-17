/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Award,
  Check,
  FileDown,
  FolderOpen,
  ArrowDownToLine,
  Building2,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  Archive,
  Sparkles,
  Cloud,
  Layers
} from 'lucide-react';
import { DownloadMaterial } from '../types.ts';
import { isCertificateAvailableForPublic, CERTIFICATE_RELEASE_LABEL, triggerMaterialDownload, isProhibitedPrivateMaterial } from '../utils/helpers.ts';
import { DocumentPreviewModal, getFileFormatDetails } from './DocumentPreviewModal.tsx';

interface DownloadsSectionProps {
  materials: DownloadMaterial[];
  onOpenCertificate: () => void;
  onIncrementDownload: (id: string) => void;
}

export const DownloadsSection: React.FC<DownloadsSectionProps> = ({
  materials,
  onOpenCertificate,
  onIncrementDownload
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeFormat, setActiveFormat] = useState<'all' | 'PDF' | 'DOCX' | 'ZIP'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Document Preview Modal State
  const [previewMaterial, setPreviewMaterial] = useState<DownloadMaterial | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const certificateAvailable = isCertificateAvailableForPublic();

  const categories = ['all', 'Fluxograma', 'Apostila', 'Legislação', 'Apresentação', 'Cartilha'];

  // Ensure prohibited or private documents are never rendered under any circumstances
  const safeMaterials = useMemo(() => {
    return materials.filter(
      (m) => m && m.id !== 'mat-5' && m.id !== 'mat-0' && !isProhibitedPrivateMaterial(m)
    );
  }, [materials]);

  // Sort materials so newly added documents (from admin panel or cloud) appear first, followed by baseline materials
  const sortedMaterials = useMemo(() => {
    return [...safeMaterials].sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (timeA !== timeB) return timeB - timeA;
      // If no createdAt, put custom materials (e.g. mat-timestamp) before baseline mat-0..mat-6
      const aIsCustom = a.id.startsWith('mat-') && a.id.length > 8;
      const bIsCustom = b.id.startsWith('mat-') && b.id.length > 8;
      if (aIsCustom && !bIsCustom) return -1;
      if (!aIsCustom && bIsCustom) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [safeMaterials]);

  // Counts by format
  const formatCounts = useMemo(() => {
    return {
      all: safeMaterials.length,
      pdf: safeMaterials.filter((m) => (m.format || 'PDF').toUpperCase() === 'PDF').length,
      docx: safeMaterials.filter((m) => (m.format || '').toUpperCase() === 'DOCX').length,
      zip: safeMaterials.filter((m) => (m.format || '').toUpperCase() === 'ZIP').length
    };
  }, [safeMaterials]);

  const filteredMaterials = useMemo(() => {
    return sortedMaterials.filter((mat) => {
      const matchesCategory = activeCategory === 'all' || mat.category === activeCategory;
      const matFormat = (mat.format || 'PDF').toUpperCase();
      const matchesFormat = activeFormat === 'all' || matFormat === activeFormat;
      const matchesSearch =
        searchTerm.trim() === '' ||
        mat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mat.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mat.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesFormat && matchesSearch;
    });
  }, [sortedMaterials, activeCategory, activeFormat, searchTerm]);

  const handleDownload = async (material: DownloadMaterial) => {
    setDownloadError(null);
    setDownloadingId(material.id);
    onIncrementDownload(material.id);

    try {
      await triggerMaterialDownload(material);
      setDownloadedId(material.id);
      setTimeout(() => {
        setDownloadedId((curr) => (curr === material.id ? null : curr));
      }, 1800);
    } catch (err: unknown) {
      console.error('Erro ao baixar documento:', err);
      setDownloadError(
        `Não foi possível baixar "${material.title}" agora. Verifique sua conexão e tente novamente.`
      );
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenPreview = (material: DownloadMaterial) => {
    setPreviewMaterial(material);
    setIsPreviewOpen(true);
  };

  return (
    <section id="downloads" className="scroll-mt-16 py-8 sm:py-12 bg-[#eef3f6] border-b-2 border-stone-300/80 relative">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Streamlined Technical Library Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-stone-800 text-white text-[11px] font-mono font-bold uppercase tracking-wider mb-2 shadow-xs">
              <FileDown className="w-3.5 h-3.5 text-[#ea7a38]" />
              <span>Repositório Técnico Digital · SUS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0a3641] tracking-tight">
              Área de Downloads & Materiais de Apoio
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Acervo de cadernos temáticos, fluxogramas oficiais da RAPS, legislações e instrumentos práticos em <strong>PDF</strong> e <strong>DOCX</strong> com pré-visualização e abertura rápida.
            </p>
          </div>

          {/* Official Certificate Validation Card */}
          <div className={`flex items-center justify-between sm:justify-start gap-3 p-3 sm:p-3.5 bg-white border-2 rounded-2xl shadow-sm ${
            certificateAvailable ? 'border-emerald-600/30' : 'border-stone-300/90'
          }`}>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              certificateAvailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}>
              {certificateAvailable ? (
                <Award className="w-5 h-5 text-emerald-600" />
              ) : (
                <Lock className="w-5 h-5 text-stone-500" />
              )}
            </div>
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-[#0a3641] leading-tight">
                Certificado Oficial (8h)
              </div>
              <div className="text-[11px] text-stone-500 leading-tight mt-0.5">
                {certificateAvailable
                  ? 'Válido com código de autenticidade'
                  : `Liberado em ${CERTIFICATE_RELEASE_LABEL}`}
              </div>
            </div>
            {certificateAvailable ? (
              <button
                type="button"
                onClick={onOpenCertificate}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
              >
                Baixar Certificado
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={`O download do certificado ficará disponível somente após o término do evento (${CERTIFICATE_RELEASE_LABEL}).`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-500 bg-stone-100 border border-stone-300 rounded-xl cursor-not-allowed shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>Após o evento</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Folder / Format Filter Bar (Document Archive Aesthetic) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-300 shadow-sm mb-6 space-y-3">
          {/* Top Row: Search + Format Badges */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por título, autor, assunto ou formato (PDF, DOCX)..."
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a3641] text-stone-900 placeholder-stone-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Format Filters */}
            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveFormat('all')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeFormat === 'all'
                    ? 'bg-[#0a3641] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                }`}
              >
                Todos ({formatCounts.all})
              </button>

              <button
                type="button"
                onClick={() => setActiveFormat(activeFormat === 'PDF' ? 'all' : 'PDF')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                  activeFormat === 'PDF'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                }`}
                title="Filtrar por arquivos em formato PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF ({formatCounts.pdf})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormat(activeFormat === 'DOCX' ? 'all' : 'DOCX')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                  activeFormat === 'DOCX'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                }`}
                title="Filtrar por arquivos editáveis em formato DOCX"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>DOCX ({formatCounts.docx})</span>
              </button>
            </div>
          </div>

          {/* Category Tabs (Archive Folders) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 border-t border-stone-100">
            <span className="text-[11px] font-mono font-bold uppercase text-stone-400 mr-1 flex items-center gap-1 hidden sm:inline-flex">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Pastas:</span>
            </span>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat;
              const count = cat === 'all'
                ? sortedMaterials.length
                : sortedMaterials.filter((m) => m.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-[#0a3641] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{cat === 'all' ? 'Todos os Documentos' : cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Download Error Alert */}
        {downloadError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Technical Dossier Cards Grid (Official Document Styling) */}
        {filteredMaterials.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-300 shadow-xs space-y-2">
            <div className="font-bold text-stone-700">Nenhum documento encontrado para os filtros selecionados.</div>
            <p>Tente remover os filtros de pasta/formato ou pesquisar por outro termo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((mat) => {
              const isDownloading = downloadingId === mat.id;
              const isDownloaded = downloadedId === mat.id;
              const formatInfo = getFileFormatDetails(mat.format);
              const isFromAdmin =
                Boolean(mat.createdAt) ||
                mat.fileUrl?.startsWith('firestore-chunked://') ||
                Boolean(mat.chunkCount && mat.chunkCount > 0) ||
                (mat.id.startsWith('mat-') && mat.id.length > 8);

              return (
                <div
                  key={mat.id}
                  className="bg-white rounded-2xl p-4 sm:p-4.5 border border-stone-300/90 shadow-xs hover:shadow-md hover:border-[#0a3641] transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Left Document Spine / Format-Specific Color Accent */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 w-1.5 ${formatInfo.spineColor} group-hover:w-2 transition-all`}
                  />

                  <div className="pl-2 space-y-2.5">
                    {/* Format Header: Specific Format Badge (PDF / DOCX / ZIP) + Category + Pages */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Format-Specific Icon & Badge */}
                        <span className={`inline-flex items-center gap-1 font-mono font-black text-[10px] px-2 py-0.5 rounded border uppercase ${formatInfo.bgBadge}`}>
                          {formatInfo.type === 'ZIP' ? (
                            <Archive className="w-3 h-3 text-amber-600" />
                          ) : (
                            <FileText className={`w-3 h-3 ${formatInfo.type === 'DOCX' ? 'text-blue-600' : 'text-rose-600'}`} />
                          )}
                          <span>{formatInfo.label}</span>
                        </span>

                        <span className="font-bold text-[10px] uppercase text-[#0a3641] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                          {mat.category}
                        </span>

                        {isFromAdmin && (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Publicado</span>
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-[10px] text-stone-500 font-semibold shrink-0">
                        {mat.size} · {mat.pages || 4} págs.
                      </span>
                    </div>

                    {/* Document Title (Clicking title opens preview) */}
                    <h3
                      onClick={() => handleOpenPreview(mat)}
                      className="text-sm sm:text-base font-bold text-[#0a3641] group-hover:text-[#ea7a38] transition-colors leading-snug break-words cursor-pointer"
                      title="Clique para pré-visualizar este documento"
                    >
                      {mat.title}
                    </h3>

                    {/* Technical Description */}
                    <p className="text-xs text-stone-600 leading-relaxed break-words font-normal line-clamp-3">
                      {mat.description}
                    </p>

                    {/* Publishing Authority */}
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{mat.author}</span>
                    </div>
                  </div>

                  {/* Document Footer: Download Stats + Quick Actions (Pré-visualizar & Baixar) */}
                  <div className="pl-2 pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-stone-400">
                      {mat.downloadsCount} downloads
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Button 1: Pré-visualizar / Abertura Rápida */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(mat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-xl border border-stone-200 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                        title="Pré-visualizar e ler documento"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0a3641]" />
                        <span>Pré-visualizar</span>
                      </button>

                      {/* Button 2: Baixar Arquivo */}
                      <button
                        type="button"
                        onClick={() => handleDownload(mat)}
                        disabled={isDownloading}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white active:scale-95 rounded-xl transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 shadow-xs ${
                          formatInfo.type === 'DOCX'
                            ? 'bg-blue-700 hover:bg-blue-800'
                            : 'bg-[#0a3641] hover:bg-[#0f4b59]'
                        }`}
                        title={`Baixar arquivo ${formatInfo.label}`}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea7a38]" />
                            <span className="hidden sm:inline">Baixando...</span>
                          </>
                        ) : isDownloaded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Baixado!</span>
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
              );
            })}
          </div>
        )}

      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        material={previewMaterial}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewMaterial(null);
        }}
        onIncrementDownload={onIncrementDownload}
      />
    </section>
  );
};
