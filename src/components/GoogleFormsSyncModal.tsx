/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Link,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Users,
  Settings,
  ExternalLink,
  ArrowRight,
  Shield,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { Registration, EventConfig } from '../types.ts';
import {
  parseExcelOrCsvFile,
  fetchAndParseGoogleSheetsUrl,
  mapRowsToRegistrations,
  ColumnMapping,
  ParseResult
} from '../utils/googleFormsIntegration.ts';

interface GoogleFormsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EventConfig;
  onUpdateConfig: (newConfig: EventConfig) => void;
  registrations: Registration[];
  onBatchImportRegistrations: (imported: Registration[]) => void;
}

export const GoogleFormsSyncModal: React.FC<GoogleFormsSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  registrations,
  onBatchImportRegistrations
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sheets_sync' | 'form_settings'>('upload');
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [customMapping, setCustomMapping] = useState<ColumnMapping>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Sheets Sync State
  const [sheetsUrl, setSheetsUrl] = useState(config.googleSheetsSyncUrl || '');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Form Settings State
  const [googleFormsUrl, setGoogleFormsUrl] = useState(config.googleFormsUrl || '');
  const [enableGoogleFormsOption, setEnableGoogleFormsOption] = useState(
    config.enableGoogleFormsOption ?? true
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoadingFile(true);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      const result = await parseExcelOrCsvFile(file, registrations);
      setParseResult(result);
      setCustomMapping(result.detectedMapping);
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      setUploadError(err.message || 'Falha ao processar o arquivo Excel do Google Forms.');
      setParseResult(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, columnName: string) => {
    if (!parseResult) return;
    const newMapping = { ...customMapping, [field]: columnName };
    setCustomMapping(newMapping);
    
    // Recalculate mapping with new user column selection
    const { mapped, duplicatesCount, newCount } = mapRowsToRegistrations(
      parseResult.rawRows,
      newMapping,
      registrations
    );

    setParseResult({
      ...parseResult,
      detectedMapping: newMapping,
      mappedRegistrations: mapped,
      duplicatesFound: duplicatesCount,
      newCount
    });
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.mappedRegistrations.length === 0) return;

    onBatchImportRegistrations(parseResult.mappedRegistrations);
    setSuccessMessage(
      `Sucesso! ${parseResult.newCount} novos participantes integrados ao Simpósio a partir do Google Forms.`
    );

    setTimeout(() => {
      setParseResult(null);
      setSelectedFile(null);
      onClose();
    }, 1800);
  };

  const handleLiveSheetsSync = async () => {
    if (!sheetsUrl.trim()) {
      setSyncError('Por favor informe a URL da planilha do Google Sheets vinculada ao formulário.');
      return;
    }

    setIsSyncingSheets(true);
    setSyncError(null);
    setSuccessMessage(null);

    try {
      const result = await fetchAndParseGoogleSheetsUrl(sheetsUrl, registrations);
      onBatchImportRegistrations(result.mappedRegistrations);
      
      // Save URL to config
      onUpdateConfig({
        ...config,
        googleSheetsSyncUrl: sheetsUrl
      });

      setSuccessMessage(
        `Sincronização concluída! ${result.newCount} novas respostas do Google Forms foram adicionadas.`
      );

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao sincronizar Google Sheets:', err);
      setSyncError(
        err.message || 'Falha ao conectar com a planilha. Certifique-se de que ela está pública ou publicada na Web.'
      );
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleSaveFormSettings = () => {
    onUpdateConfig({
      ...config,
      googleFormsUrl: googleFormsUrl.trim(),
      enableGoogleFormsOption
    });
    setSuccessMessage('Configurações do Google Forms salvas com sucesso!');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0a3641] via-[#0e4857] to-[#028090] text-white p-4 sm:p-6 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-[#ea7a38]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#ea7a38]/20 border border-[#ea7a38]/40 text-[#f6aa7a] text-[11px] font-mono uppercase font-bold tracking-wider mb-1">
                Integração Multicanal SUS
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Integração Google Forms & Planilhas Excel
              </h2>
              <p className="text-xs sm:text-sm text-stone-200 mt-0.5 leading-snug">
                Integre respostas vindas do Google Forms diretamente com a base oficial de inscritos do Simpósio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'upload'
                ? 'border-[#ea7a38] text-[#0a3641] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-4 h-4 text-[#ea7a38]" />
            <span>Upload de Excel (.xlsx / .csv)</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets_sync')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'sheets_sync'
                ? 'border-[#ea7a38] text-[#0a3641] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Link className="w-4 h-4 text-[#028090]" />
            <span>Sincronizar via Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveTab('form_settings')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'form_settings'
                ? 'border-[#ea7a38] text-[#0a3641] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Settings className="w-4 h-4 text-purple-600" />
            <span>Configurações do Formulário Externo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fade-in shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold">{successMessage}</span>
            </div>
          )}

          {/* TAB 1: Upload Excel/CSV from Google Forms */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Como baixar do Google Forms:</strong> No seu Google Forms, clique na aba <em>"Respostas"</em> &gt; clique nos três pontinhos verticais (⋮) &gt; selecione <em>"Fazer o download das respostas (.csv)"</em> OU clique no ícone verde de planilha e baixe como <em>Arquivo &gt; Fazer o download &gt; Microsoft Excel (.xlsx)</em>.
                </div>
              </div>

              {/* Upload Dropzone */}
              {!parseResult && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-[#ea7a38] bg-stone-50/50 hover:bg-[#ea7a38]/5 rounded-2xl p-6 sm:p-10 text-center transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-stone-200 group-hover:border-[#ea7a38] flex items-center justify-center text-[#ea7a38] shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    {isLoadingFile ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-[#0a3641]" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[#0a3641]">
                    {isLoadingFile ? 'Processando respostas da planilha...' : 'Selecione ou arraste a planilha do Google Forms'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Suporta arquivos oficiais <strong>.xlsx</strong>, <strong>.xls</strong> e <strong>.csv</strong>. As colunas de Nome, CPF, E-mail, Município e Cargo são identificadas automaticamente.
                  </p>

                  <button
                    type="button"
                    className="mt-4 px-4 py-2 bg-white hover:bg-stone-100 text-[#0a3641] border border-stone-300 font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Procurar no Computador
                  </button>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Result & Mapping Preview */}
              {parseResult && (
                <div className="space-y-5 animate-fade-in">
                  {/* File Info Bar */}
                  <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-bold text-[#0a3641]">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile?.name}</span>
                      <span className="text-stone-400 font-normal">
                        ({(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-stone-700 font-medium text-xs">
                        {parseResult.rawRows.length} linhas lidas
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-bold text-xs">
                        +{parseResult.newCount} novos participantes
                      </span>
                      {parseResult.duplicatesFound > 0 && (
                        <span className="px-2.5 py-1 bg-amber-100 border border-amber-200 text-amber-800 rounded-lg font-bold text-xs">
                          {parseResult.duplicatesFound} já cadastrados (não duplicará)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column Mapping Review */}
                  <div className="border border-stone-200 rounded-xl p-4 bg-white shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs sm:text-sm font-bold text-[#0a3641] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#ea7a38]" />
                        Mapeamento Automático de Colunas do Google Forms
                      </h4>
                      <span className="text-[11px] text-stone-500">
                        Ajuste caso alguma coluna seja diferente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {/* Nome Completo */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Nome Completo *
                        </label>
                        <select
                          value={customMapping.fullNameCol || ''}
                          onChange={(e) => handleMappingChange('fullNameCol', e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-medium text-stone-800 focus:bg-white"
                        >
                          <option value="">-- Selecione a Coluna --</option>
                          {parseResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* E-mail */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          E-mail *
                        </label>
                        <select
                          value={customMapping.emailCol || ''}
                          onChange={(e) => handleMappingChange('emailCol', e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-medium text-stone-800 focus:bg-white"
                        >
                          <option value="">-- Selecione a Coluna --</option>
                          {parseResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* CPF */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          CPF
                        </label>
                        <select
                          value={customMapping.cpfCol || ''}
                          onChange={(e) => handleMappingChange('cpfCol', e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-medium text-stone-800 focus:bg-white"
                        >
                          <option value="">-- Selecione a Coluna --</option>
                          {parseResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Telefone */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Telefone / WhatsApp
                        </label>
                        <select
                          value={customMapping.phoneCol || ''}
                          onChange={(e) => handleMappingChange('phoneCol', e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-medium text-stone-800 focus:bg-white"
                        >
                          <option value="">-- Selecione a Coluna --</option>
                          {parseResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Município */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Município
                        </label>
                        <select
                          value={customMapping.cityCol || ''}
                          onChange={(e) => handleMappingChange('cityCol', e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-medium text-stone-800 focus:bg-white"
                        >
                          <option value="">-- Selecione a Coluna --</option>
                          {parseResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cargo / Função */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Cargo / Função
                        </label>
                        <select
                          value={customMapping.roleCol || ''}
                          onChange={(e) => handleMappingChange('roleCol', e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-medium text-stone-800 focus:bg-white"
                        >
                          <option value="">-- Selecione a Coluna --</option>
                          {parseResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table of First Few Entries */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-[#0a3641] flex items-center justify-between">
                      <span>Prévia dos Primeiros Participantes Identificados:</span>
                      <span className="text-stone-500 font-normal">
                        Mostrando até 4 de {parseResult.mappedRegistrations.length}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
                          <tr>
                            <th className="p-2.5">Nome</th>
                            <th className="p-2.5">E-mail</th>
                            <th className="p-2.5">Município</th>
                            <th className="p-2.5">Cargo</th>
                            <th className="p-2.5">Origem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 text-stone-800">
                          {parseResult.mappedRegistrations.slice(0, 4).map((reg, i) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="p-2.5 font-bold text-[#0a3641]">{reg.fullName}</td>
                              <td className="p-2.5 text-stone-600">{reg.email}</td>
                              <td className="p-2.5">{reg.city}</td>
                              <td className="p-2.5">{reg.professionalRole}</td>
                              <td className="p-2.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                                  Google Forms
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParseResult(null);
                        setSelectedFile(null);
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      Escolher outro arquivo
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] hover:brightness-105 active:scale-95 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-white" />
                      <span>Concluir e Integrar {parseResult.newCount} Participantes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Live Google Sheets Sync */}
          {activeTab === 'sheets_sync' && (
            <div className="space-y-5">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-sky-900">
                  <Link className="w-4 h-4 text-sky-700" />
                  <span>Sincronização Direta com a Planilha de Respostas do Google Forms</span>
                </div>
                <p>
                  Conecte o link da planilha do Google Sheets que recebe as respostas do Google Forms. A cada clique em sincronizar, a plataforma busca automaticamente novas inscrições e as adiciona sem duplicar quem já está cadastrado.
                </p>
                <div className="p-2.5 bg-white/80 rounded-lg border border-sky-200 text-xs text-stone-700">
                  <strong>Dica de Publicação:</strong> No Google Sheets, vá em <em>Arquivo &gt; Compartilhar &gt; Publicar na Web</em> e escolha o formato <strong>Valores separados por vírgula (.csv)</strong> para permitir atualização instantânea.
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#0a3641] mb-1.5">
                  Link da Planilha Google Sheets ou URL de Exportação CSV:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit ou /export?format=csv"
                    className="flex-1 p-3 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#0a3641] focus:border-[#0a3641] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleLiveSheetsSync}
                    disabled={isSyncingSheets}
                    className="px-5 py-3 bg-[#0a3641] hover:bg-[#028090] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {isSyncingSheets ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-white" />
                    )}
                    <span>{isSyncingSheets ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>
                </div>
              </div>

              {syncError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Não foi possível sincronizar automaticamente:</strong>
                    <span>{syncError}</span>
                    <p className="mt-1 text-stone-600">
                      Alternativa recomendada: use a aba <strong>Upload de Excel</strong> acima para subir o arquivo baixado do Google Forms.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Google Forms Integration Settings (Internal Management) */}
          {activeTab === 'form_settings' && (
            <div className="space-y-5">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <Settings className="w-4 h-4 text-purple-700" />
                  <span>Integração de Planilhas Google Forms</span>
                </div>
                <p>
                  O participante final realiza sua inscrição unicamente pelo formulário oficial do Simpósio.
                  Esta seção permite ao gestor vincular e gerenciar a importação de respostas coletadas pelo Google Forms ou planilhas externas para unificação automática da base de dados.
                </p>
              </div>

              {/* Google Forms URL */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#0a3641] mb-1">
                  Link de Referência do Formulário Google Forms:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={googleFormsUrl}
                    onChange={(e) => setGoogleFormsUrl(e.target.value)}
                    placeholder="https://forms.gle/exemplo-simposio-carangola ou https://docs.google.com/forms/..."
                    className="flex-1 p-3 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0a3641] outline-none"
                  />
                  {googleFormsUrl && (
                    <a
                      href={googleFormsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Testar Link</span>
                    </a>
                  )}
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Link interno de controle do formulário para a coordenação do evento.
                </span>
              </div>

              {/* Unified Experience Status Notice */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  SUS
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#0a3641]">
                    Fluxo Único e Transparente para o Participante
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    O público geral acessa apenas uma ficha de inscrição oficial. A sincronização de planilhas é 100% interna e transparente.
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveFormSettings}
                  className="px-6 py-2.5 bg-[#0a3641] hover:bg-[#028090] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Salvar Preferências dos Formulários
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 border-t border-stone-200 p-3 sm:p-4 px-4 sm:px-6 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0a3641]" />
            <span>Compatibilidade completa com Lei Geral de Proteção de Dados (LGPD) e SUS</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
