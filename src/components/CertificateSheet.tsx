/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  Award,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import { Registration, EventConfig, CertificateDesignConfig } from '../types.ts';
import {
  formatCPF,
  generateCertificateHash,
  getCertificateDesign,
  formatCertificateBodyText
} from '../utils/helpers.ts';

interface CertificateSheetProps {
  attendee: Registration;
  config: EventConfig;
  designOverride?: CertificateDesignConfig;
  id?: string;
}

export const CertificateSheet: React.FC<CertificateSheetProps> = ({
  attendee,
  config,
  designOverride,
  id = 'certificado-oficial-impressao'
}) => {
  const design = designOverride || getCertificateDesign(config);
  const bodyText = formatCertificateBodyText(design.bodyTemplate, config);

  // Colors strictly inspired by the symposium banner
  const primaryColor = '#0a3641'; // Banner deep forest / dark teal
  const accentColor = '#ea7a38';  // Banner warm orange / gold
  const secondaryColor = '#028090'; // Banner sage / teal accent

  const cpfDigits = (attendee.cpf || '').replace(/\D/g, '');
  const hasValidCpf = cpfDigits.length === 11;
  const displayCpf = hasValidCpf ? formatCPF(attendee.cpf) : attendee.code;
  const certHash = generateCertificateHash(attendee.code, attendee.cpf);

  return (
    <div
      id={id}
      className="print-certificate-container relative bg-white text-stone-800 w-full max-w-[1080px] mx-auto aspect-[297/210] flex flex-col justify-between p-5 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden font-serif select-none"
      style={{
        boxSizing: 'border-box',
        border: `7px solid ${primaryColor}`
      }}
    >
      {/* Ornamental Inner Double Border & Corner Flourishes */}
      <div
        className="absolute inset-2 sm:inset-3 border sm:border-2 rounded-xl pointer-events-none"
        style={{ borderColor: `${accentColor}` }}
      />
      <div
        className="absolute inset-3 sm:inset-4 border border-stone-200/80 rounded-lg pointer-events-none"
      />

      {/* Corner Geometric Accents (Banner Inspired) */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: primaryColor }} />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: primaryColor }} />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: primaryColor }} />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: primaryColor }} />

      {/* Subtle Central Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <div
          className="text-[140px] sm:text-[180px] font-black tracking-widest font-sans"
          style={{ color: primaryColor }}
        >
          SUS
        </div>
      </div>

      {/* ========================================================
          1. INSTITUTIONAL TOP HEADER (Logo SUS Oficial + SUS Brasil)
          ======================================================== */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-stone-200/90 pb-3">
        <div className="flex items-center gap-3">
          {/* Logo Oficial do SUS */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white p-0.5 border-2 shadow-xs shrink-0 flex items-center justify-center" style={{ borderColor: accentColor }}>
            <img
              src="/assets/logo-sus-oficial.jpg"
              alt="Logo Oficial SUS"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                // Fallback to favicon PNG if jpg fails
                (e.currentTarget as HTMLImageElement).src = '/favicon-192x192.png';
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-black text-xs sm:text-sm tracking-wider uppercase px-2 py-0.5 rounded text-white shadow-xs" style={{ backgroundColor: primaryColor }}>
                SUS Brasil
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase text-stone-500">
                Estado de Minas Gerais
              </span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold tracking-tight mt-0.5" style={{ color: primaryColor }}>
              PREFEITURA MUNICIPAL DE CARANGOLA · SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-stone-600 font-sans font-medium">
              UEMG Carangola · Rede de Atenção Psicossocial (RAPS) Microrregional
            </div>
          </div>
        </div>

        {/* Security Registration Chip */}
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 font-sans">
          <div className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full shadow-2xs">
            <FileCheck2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span className="text-[9.5px] font-mono font-bold" style={{ color: primaryColor }}>
              REGISTRO: {attendee.code}
            </span>
          </div>
          <span className="text-[8.5px] font-mono text-stone-500">
            Livro RAPS-2026 · Fl. {attendee.code.replace(/\D/g, '') || '01'}
          </span>
        </div>
      </div>

      {/* ========================================================
          2. DIPLOMA MAIN HEADING (CERTIFICADO)
          ======================================================== */}
      <div className="relative z-10 text-center my-auto py-2">
        <div className="flex items-center justify-center gap-3 sm:gap-6 my-1">
          <div className="h-0.5 w-12 sm:w-20 rounded" style={{ backgroundColor: accentColor }} />
          <h1
            className="text-2xl sm:text-4xl md:text-[42px] font-black tracking-[0.22em] uppercase font-serif"
            style={{ color: primaryColor }}
          >
            CERTIFICADO
          </h1>
          <div className="h-0.5 w-12 sm:w-20 rounded" style={{ backgroundColor: accentColor }} />
        </div>

        <div className="text-[10.5px] sm:text-xs text-stone-500 uppercase tracking-widest font-mono font-medium mt-1">
          Certificamos formalmente que
        </div>

        {/* Recipient Full Name */}
        <div className="my-1 sm:my-2">
          <span
            className="text-xl sm:text-3xl md:text-[32px] font-black tracking-tight inline-block border-b-2 px-4 pb-0.5"
            style={{ color: primaryColor, borderColor: accentColor }}
          >
            {attendee.fullName.toUpperCase()}
          </span>
        </div>

        {/* Recipient Metadata Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 my-2 text-[10.5px] sm:text-xs font-sans">
          <span className="bg-stone-50 border border-stone-200 px-2.5 py-0.5 rounded-md font-mono text-stone-800">
            {hasValidCpf ? 'CPF' : 'Identificação'}: <strong>{displayCpf}</strong>
          </span>
          <span className="bg-stone-50 border border-stone-200 px-2.5 py-0.5 rounded-md text-stone-800">
            Função: <strong>{attendee.professionalRole}</strong>
          </span>
          <span className="bg-stone-50 border border-stone-200 px-2.5 py-0.5 rounded-md text-stone-800">
            Município: <strong>{attendee.city} - MG</strong>
          </span>
          <span className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-2.5 py-0.5 rounded-md font-mono font-bold">
            Inscrição: {attendee.code}
          </span>
        </div>

        {/* Formal Certification Text */}
        <p className="text-stone-700 text-xs sm:text-[13px] md:text-[13.5px] leading-relaxed max-w-4xl mx-auto px-4 text-justify sm:text-center font-sans font-normal">
          {bodyText}
        </p>

        {/* Thematic Axes Ribbon - Compact Single Row */}
        <div className="mt-3 max-w-4xl mx-auto font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
            <div className="bg-stone-50/90 border border-stone-200 p-2 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: secondaryColor }} />
              <div className="min-w-0">
                <span className="text-[9px] font-mono font-bold uppercase block" style={{ color: secondaryColor }}>
                  Eixo Temático 1
                </span>
                <span className="text-[10px] font-bold text-stone-800 truncate block">
                  Fluxograma da RAPS (Atenção Básica e CAPS)
                </span>
              </div>
            </div>

            <div className="bg-stone-50/90 border border-stone-200 p-2 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              <div className="min-w-0">
                <span className="text-[9px] font-mono font-bold uppercase block" style={{ color: accentColor }}>
                  Eixo Temático 2
                </span>
                <span className="text-[10px] font-bold text-stone-800 truncate block">
                  Hospital Geral, Leitos e Urgências
                </span>
              </div>
            </div>

            <div className="bg-stone-50/90 border border-stone-200 p-2 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <div className="min-w-0">
                <span className="text-[9px] font-mono font-bold uppercase block" style={{ color: primaryColor }}>
                  Eixo Temático 3
                </span>
                <span className="text-[10px] font-bold text-stone-800 truncate block">
                  Judicialização & Cuidado em Liberdade
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. FOOTER: EVENT INFO, SIGNATURES & QR CODE
          ======================================================== */}
      <div className="relative z-10 pt-3 border-t border-stone-200/90 font-sans">
        {/* Compact Event Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-3 text-[10px] sm:text-[11px] text-stone-700 font-semibold">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>{config.eventFullDate || '08 de Dezembro de 2026'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: secondaryColor }} />
            <span>{config.eventHours || '07h30 às 16h30'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            <span>{config.locationName || 'Auditório da UEMG Carangola'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-bold">
            <Award className="w-3.5 h-3.5 text-amber-700" />
            <span>Carga Horária: {config.certificateWorkload || 8} Horas</span>
          </div>
        </div>

        {/* Signatures & QR Code Verification */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          {/* Official Signatures */}
          <div className="sm:col-span-8 grid grid-cols-2 gap-4 text-center">
            {/* Signature 1 */}
            <div className="bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/80">
              <div className="h-7 flex items-center justify-center">
                <span className="font-serif italic font-bold text-stone-700 text-xs sm:text-sm">
                  {design.signature1Name || 'Amanda Silveira Abreu'}
                </span>
              </div>
              <div className="w-32 sm:w-40 h-0.5 bg-stone-400 mx-auto mb-1" />
              <div className="text-[10.5px] sm:text-xs font-extrabold leading-tight" style={{ color: primaryColor }}>
                {design.signature1Role || 'Coordenação de Saúde Mental'}
              </div>
              <div className="text-[9px] text-stone-600 font-medium">
                {design.signature1Org || 'Rede de Atenção Psicossocial · Carangola/MG'}
              </div>
            </div>

            {/* Signature 2 */}
            <div className="bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/80">
              <div className="h-7 flex items-center justify-center">
                <span className="font-serif italic font-bold text-stone-700 text-xs sm:text-sm">
                  {design.signature2Name || 'Gisella Loiola Consensa'}
                </span>
              </div>
              <div className="w-32 sm:w-40 h-0.5 bg-stone-400 mx-auto mb-1" />
              <div className="text-[10.5px] sm:text-xs font-extrabold leading-tight" style={{ color: primaryColor }}>
                {design.signature2Role || 'Secretária Municipal de Saúde'}
              </div>
              <div className="text-[9px] text-stone-600 font-medium">
                {design.signature2Org || 'Gestão Microrregional SUS / Minas Gerais'}
              </div>
            </div>
          </div>

          {/* Digital QR Authentication */}
          <div className="sm:col-span-4 bg-stone-50 p-2.5 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-white border border-stone-200 shrink-0">
              <QrCode className="w-10 h-10 sm:w-11 sm:h-11" style={{ color: primaryColor }} />
            </div>
            <div className="text-[9px] leading-tight min-w-0">
              <div className="font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Autenticação Digital SUS</span>
              </div>
              <div className="font-mono font-bold text-stone-800 text-[8px] mt-0.5 truncate bg-white px-1.5 py-0.5 rounded border border-stone-200">
                {certHash}
              </div>
              <div className="text-[8px] text-stone-500 mt-0.5">
                Conforme Lei 10.216/2001 e normas do SUS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
