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
  FileCheck2
} from 'lucide-react';
import { Registration, EventConfig, CertificateDesignConfig } from '../types.ts';
import {
  formatCPF,
  generateCertificateHash,
  getCertificateDesign,
  sanitizeCertificateBannerUrl,
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
  const design = designOverride
    ? {
        ...getCertificateDesign(config),
        ...designOverride,
        bannerImageUrl: sanitizeCertificateBannerUrl(designOverride.bannerImageUrl)
      }
    : getCertificateDesign(config);
  const bodyText = formatCertificateBodyText(design.bodyTemplate, config);

  const primaryColor = design.primaryColor || '#0a3641';
  const accentColor = design.accentColor || '#ea7a38';
  const secondaryColor = design.secondaryColor || '#028090';
  const backgroundColor = design.backgroundColor || '#ffffff';

  const isSerif = design.fontFamily === 'serif';
  const isClassic = design.layoutTheme === 'institutional_classic';
  const isModernClean = design.layoutTheme === 'modern_clean';
  const isRapsWaves = !isClassic && !isModernClean;

  const outerBorderWidth =
    design.borderStyle === 'minimal' ? '2px' : design.borderStyle === 'classic' ? '6px' : '7px';
  const safeBannerUrl = design.showBannerImage
    ? sanitizeCertificateBannerUrl(design.bannerImageUrl)
    : '';

  const cpfDigits = (attendee.cpf || '').replace(/\D/g, '');
  const hasValidCpf = cpfDigits.length === 11;
  const displayCpf = hasValidCpf ? formatCPF(attendee.cpf) : attendee.code;
  const certHash = generateCertificateHash(attendee.code, attendee.cpf);

  return (
    <div
      id={id}
      className={`print-certificate-container relative text-stone-800 w-full max-w-[1080px] mx-auto aspect-[297/210] flex flex-col justify-between p-5 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden select-none ${
        isSerif ? 'font-serif' : 'font-sans'
      }`}
      style={{
        boxSizing: 'border-box',
        backgroundColor,
        border: `${outerBorderWidth} solid ${primaryColor}`
      }}
    >
      {/* Theme Visual Accents */}
      {isRapsWaves && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${accentColor})`
          }}
        />
      )}
      {isModernClean && (
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-1.5 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${primaryColor}, ${accentColor})`
          }}
        />
      )}

      {/* Ornamental Inner Borders per borderStyle */}
      {design.borderStyle === 'double' && (
        <>
          <div
            className="absolute inset-2 sm:inset-3 border sm:border-2 rounded-xl pointer-events-none"
            style={{ borderColor: accentColor }}
          />
          <div className="absolute inset-3 sm:inset-4 border border-stone-200/80 rounded-lg pointer-events-none" />
        </>
      )}
      {design.borderStyle === 'classic' && (
        <div
          className="absolute inset-2.5 sm:inset-3.5 border rounded-xl pointer-events-none opacity-65"
          style={{ borderColor: accentColor }}
        />
      )}

      {/* Corner Geometric Accents (omitted in modern_clean) */}
      {!isModernClean && (
        <>
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: primaryColor }} />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: primaryColor }} />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: primaryColor }} />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: primaryColor }} />
        </>
      )}

      {/* Optional Central Watermark */}
      {design.showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none">
          <div
            className="text-[120px] sm:text-[160px] font-black tracking-widest font-sans uppercase text-center px-6"
            style={{ color: primaryColor }}
          >
            {design.watermarkText || 'SUS'}
          </div>
        </div>
      )}

      {/* ========================================================
          1. INSTITUTIONAL TOP HEADER + OPTIONAL BANNER STRIP
          ======================================================== */}
      <div className="relative z-10 border-b border-stone-200/90 pb-2.5 space-y-2">
        {safeBannerUrl && (
          <div className="w-full max-h-10 sm:max-h-12 overflow-hidden rounded-lg border border-stone-200/80 bg-white/70 flex items-center justify-center">
            <img
              src={safeBannerUrl}
              alt="Banner Institucional do Certificado"
              className="w-full h-10 sm:h-12 object-cover"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo Oficial do SUS */}
            <div
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden bg-white p-0.5 border-2 shadow-xs shrink-0 flex items-center justify-center"
              style={{ borderColor: accentColor }}
            >
              <img
                src="/assets/logo-sus-oficial.jpg"
                alt="Logo Oficial SUS"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/favicon-192x192.png';
                }}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="font-sans font-black text-[10px] sm:text-xs tracking-wider uppercase px-2 py-0.5 rounded text-white shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  SUS Brasil
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase text-stone-600">
                  {design.institutionTopLine || 'Estado de Minas Gerais'}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-extrabold tracking-tight mt-0.5" style={{ color: primaryColor }}>
                {design.institutionName || 'PREFEITURA MUNICIPAL DE CARANGOLA · SECRETARIA MUNICIPAL DE SAÚDE'}
              </div>
              <div className="text-[9.5px] sm:text-[10.5px] text-stone-600 font-sans font-medium">
                {design.institutionSub || 'UEMG Carangola · Rede de Atenção Psicossocial (RAPS) Microrregional'}
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
      </div>

      {/* ========================================================
          2. DIPLOMA MAIN HEADING & PARTICIPANT
          ======================================================== */}
      <div className="relative z-10 text-center my-auto py-1.5">
        {design.badgeLabel && design.badgeLabel.trim() !== '' && (
          <div className="mb-1">
            <span
              className="inline-block font-sans text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: secondaryColor }}
            >
              {design.badgeLabel}
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 sm:gap-6 my-1">
          <div className="h-0.5 w-12 sm:w-20 rounded" style={{ backgroundColor: accentColor }} />
          <h1
            className={`text-2xl sm:text-4xl md:text-[40px] font-black tracking-[0.18em] uppercase ${
              isSerif ? 'font-serif' : 'font-sans'
            }`}
            style={{ color: primaryColor }}
          >
            {design.mainTitle || 'CERTIFICADO'}
          </h1>
          <div className="h-0.5 w-12 sm:w-20 rounded" style={{ backgroundColor: accentColor }} />
        </div>

        <div className="text-[10.5px] sm:text-xs text-stone-500 uppercase tracking-widest font-mono font-medium mt-0.5">
          {design.preNameText || 'Certificamos formalmente que'}
        </div>

        {/* Recipient Full Name */}
        <div className="my-1 sm:my-1.5">
          <span
            className="text-xl sm:text-3xl md:text-[30px] font-black tracking-tight inline-block border-b-2 px-4 pb-0.5"
            style={{ color: primaryColor, borderColor: accentColor }}
          >
            {attendee.fullName.toUpperCase()}
          </span>
        </div>

        {/* Recipient Metadata Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 my-1.5 text-[10px] sm:text-xs font-sans">
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
        <p className="text-stone-700 text-xs sm:text-[12.5px] md:text-[13px] leading-relaxed max-w-4xl mx-auto px-4 text-justify sm:text-center font-sans font-normal">
          {bodyText}
        </p>

        {design.footerQuote && design.footerQuote.trim() !== '' && (
          <p className="mt-1.5 text-[10.5px] sm:text-xs italic font-medium" style={{ color: secondaryColor }}>
            “{design.footerQuote}”
          </p>
        )}

        {/* Thematic Axes Ribbon (toggled by showThematicAxes) */}
        {design.showThematicAxes && (
          <div className="mt-2.5 max-w-4xl mx-auto font-sans">
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
        )}
      </div>

      {/* ========================================================
          3. FOOTER: EVENT INFO, SIGNATURES, QR CODE & OPTIONAL WAVES
          ======================================================== */}
      <div className="relative z-10 pt-2.5 border-t border-stone-200/90 font-sans">
        {/* Compact Event Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-2.5 text-[10px] sm:text-[11px] text-stone-700 font-semibold">
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

        {/* Signatures & Optional Digital Authentication */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className={`${design.showQrValidation ? 'sm:col-span-8' : 'sm:col-span-12'} grid grid-cols-2 gap-4 text-center`}>
            {/* Signature 1 */}
            <div className="bg-stone-50/70 p-2 rounded-xl border border-stone-200/80">
              <div className="h-6 flex items-center justify-center">
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
            <div className="bg-stone-50/70 p-2 rounded-xl border border-stone-200/80">
              <div className="h-6 flex items-center justify-center">
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

          {design.showQrValidation && (
            <div className="sm:col-span-4 bg-stone-50 p-2 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-white border border-stone-200 shrink-0">
                <QrCode className="w-9 h-9 sm:w-10 sm:h-10" style={{ color: primaryColor }} />
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
          )}
        </div>

        {design.showBottomWaves && (
          <div className="mt-2 overflow-hidden rounded-md opacity-85" aria-hidden="true">
            <svg viewBox="0 0 1200 28" preserveAspectRatio="none" className="w-full h-3.5 block">
              <path
                d="M0,18 C220,4 420,28 640,14 C860,0 1040,24 1200,10 L1200,28 L0,28 Z"
                fill={primaryColor}
                fillOpacity="0.85"
              />
              <path
                d="M0,22 C260,10 520,28 780,16 C980,8 1100,22 1200,16 L1200,28 L0,28 Z"
                fill={secondaryColor}
                fillOpacity="0.7"
              />
              <path
                d="M0,25 C340,18 620,28 920,20 C1080,16 1150,24 1200,22 L1200,28 L0,28 Z"
                fill={accentColor}
                fillOpacity="0.8"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
