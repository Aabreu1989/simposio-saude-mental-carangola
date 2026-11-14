import React from 'react';
import {
  Award,
  CheckCircle,
  Sparkles,
  QrCode,
  Network,
  Building2,
  Scale,
  Calendar,
  Clock,
  MapPin,
  FileCheck2
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
  const fontClass = design.fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  const outerBorderWidth =
    design.borderStyle === 'minimal'
      ? '3px'
      : design.borderStyle === 'classic'
      ? '8px'
      : '10px';

  const backgroundPattern =
    design.layoutTheme === 'raps_waves'
      ? `radial-gradient(${design.primaryColor}0d 1.2px, transparent 1.2px), linear-gradient(135deg, #ffffff 0%, ${design.backgroundColor} 60%, ${design.accentColor}12 100%)`
      : design.layoutTheme === 'institutional_classic'
      ? `linear-gradient(180deg, #ffffff 0%, ${design.backgroundColor} 100%)`
      : design.backgroundColor;

  return (
    <div
      id={id}
      className={`print-certificate-container relative rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-2xl overflow-hidden text-stone-800 ${fontClass}`}
      style={{
        minHeight: '600px',
        backgroundColor: design.backgroundColor,
        backgroundImage: backgroundPattern,
        backgroundSize: design.layoutTheme === 'raps_waves' ? '24px 24px, 100% 100%' : undefined,
        borderStyle: 'solid',
        borderWidth: outerBorderWidth,
        borderColor: design.primaryColor
      }}
    >
      {/* Decorative Inner Border Frame */}
      {design.borderStyle === 'double' && (
        <div
          className="absolute inset-2 sm:inset-3 border sm:border-2 rounded-xl sm:rounded-2xl pointer-events-none"
          style={{ borderColor: `${design.accentColor}66` }}
        />
      )}
      {design.borderStyle === 'classic' && (
        <div
          className="absolute inset-2.5 border rounded-xl pointer-events-none"
          style={{ borderColor: `${design.primaryColor}33` }}
        />
      )}

      {/* Corner Watercolor Accent Swatches (Only in RAPS Waves theme) */}
      {design.layoutTheme === 'raps_waves' && (
        <>
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-bl-full pointer-events-none"
            style={{
              background: `linear-gradient(225deg, ${design.accentColor}24 0%, ${design.accentColor}0a 50%, transparent 100%)`
            }}
          />
          <div
            className="absolute top-0 left-0 w-64 h-64 rounded-br-full pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${design.secondaryColor}1c 0%, transparent 70%)`
            }}
          />
        </>
      )}

      {/* Optional Watermark */}
      {design.showWatermark && design.watermarkText.trim() && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
          <div
            className="text-[140px] sm:text-[170px] font-black tracking-tighter"
            style={{ color: design.primaryColor }}
          >
            {design.watermarkText}
          </div>
        </div>
      )}

      {/* TOP ROW: INSTITUTIONAL CREST */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl text-white flex flex-col items-center justify-center shadow-sm shrink-0 border"
            style={{ backgroundColor: design.primaryColor, borderColor: design.secondaryColor }}
          >
            <span className="text-[13px] font-black tracking-tight leading-none">SUS</span>
            <span className="text-[8px] font-bold uppercase" style={{ color: design.accentColor }}>
              Brasil
            </span>
          </div>
          <div>
            <div
              className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest uppercase"
              style={{ color: design.accentColor }}
            >
              {design.institutionTopLine}
            </div>
            <div
              className="text-xs sm:text-sm font-extrabold tracking-tight"
              style={{ color: design.primaryColor }}
            >
              {design.institutionName}
            </div>
            <div className="text-[10px] sm:text-[11px] text-stone-600 font-medium">
              {design.institutionSub}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full border border-stone-200 shadow-2xs">
          <FileCheck2 className="w-4 h-4" style={{ color: design.secondaryColor }} />
          <span className="text-[10px] font-mono font-bold" style={{ color: design.primaryColor }}>
            REGISTRO: {attendee.code} · LIVRO RAPS-2026
          </span>
        </div>
      </div>

      {/* HERO BANNER ARTWORK & QUOTE */}
      {(design.showBannerImage || design.footerQuote.trim()) && (
        <div className="relative z-10 my-3 sm:my-4 flex flex-col items-center justify-center">
          {design.showBannerImage && design.bannerImageUrl && (
            <div className="w-full flex justify-center items-center bg-white/75 p-2 sm:p-3 rounded-2xl border border-stone-200/80 shadow-xs">
              <img
                src={design.bannerImageUrl}
                alt={config.editionTitle}
                referrerPolicy="no-referrer"
                className="w-full max-h-40 sm:max-h-52 object-contain rounded-xl"
              />
            </div>
          )}

          {design.footerQuote.trim() && (
            <div className="mt-2.5 flex items-center justify-center gap-2 text-center px-4">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: design.accentColor }} />
              <p className="text-xs sm:text-sm text-stone-700 leading-snug font-medium italic max-w-2xl">
                {design.footerQuote}
              </p>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: design.secondaryColor }} />
            </div>
          )}
        </div>
      )}

      {/* DIPLOMA TITLE & RECIPIENT */}
      <div className="relative z-10 text-center my-6 space-y-3">
        <div className="inline-block">
          {design.badgeLabel.trim() && (
            <div
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-white text-[11px] font-mono font-bold tracking-widest uppercase mb-1 shadow-xs"
              style={{ backgroundColor: design.primaryColor }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: design.accentColor }} />
              <span>{design.badgeLabel}</span>
              <Sparkles className="w-3.5 h-3.5" style={{ color: design.accentColor }} />
            </div>
          )}
          <h2
            className="text-2xl sm:text-4xl font-black tracking-wide uppercase"
            style={{ color: design.primaryColor }}
          >
            {design.mainTitle}
          </h2>
        </div>

        <div className="pt-1">
          <div className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-widest font-mono font-medium">
            {design.preNameText}
          </div>
          <div
            className="text-2xl sm:text-4xl font-black tracking-tight mt-1 px-4 py-1 border-b-2 inline-block"
            style={{ color: design.primaryColor, borderColor: design.accentColor }}
          >
            {attendee.fullName.toUpperCase()}
          </div>
        </div>

        {/* Participant Metadata Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-sans">
          {(attendee.cpf || '').replace(/\D/g, '').length === 11 ? (
            <span className="bg-white/95 border border-stone-300 px-3 py-1 rounded-lg font-mono text-stone-800 shadow-2xs">
              CPF: <strong>{formatCPF(attendee.cpf)}</strong>
            </span>
          ) : (
            <span className="bg-white/95 border border-stone-300 px-3 py-1 rounded-lg font-mono text-stone-800 shadow-2xs">
              Nº Participante: <strong>{attendee.code}</strong>
            </span>
          )}
          <span className="bg-white/95 border border-stone-300 px-3 py-1 rounded-lg text-stone-800 shadow-2xs">
            Função: <strong>{attendee.professionalRole}</strong>
          </span>
          <span className="bg-white/95 border border-stone-300 px-3 py-1 rounded-lg text-stone-800 shadow-2xs">
            Município: <strong>{attendee.city} - MG</strong>
          </span>
          <span className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-1 rounded-lg font-mono text-[11px] font-bold shadow-2xs">
            Inscrição: {attendee.code}
          </span>
        </div>

        {/* Formal Certification Text */}
        <p className="text-stone-700 text-xs sm:text-[13.5px] leading-relaxed max-w-3xl mx-auto pt-2 text-justify sm:text-center">
          {bodyText}
        </p>
      </div>

      {/* THEMATIC AXES BLOCK */}
      {design.showThematicAxes && (
        <div className="relative z-10 pt-1 pb-4 font-sans">
          <div className="flex items-center justify-center mb-3">
            <div
              className="px-5 py-1 rounded-full text-white text-xs font-bold tracking-wide shadow-2xs"
              style={{ backgroundColor: design.primaryColor }}
            >
              Eixos Temáticos
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
            <div
              className="p-3 rounded-2xl bg-white/90 border-2 shadow-2xs flex items-start gap-3"
              style={{ borderColor: `${design.secondaryColor}4d` }}
            >
              <div
                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${design.secondaryColor}18`, borderColor: `${design.secondaryColor}55` }}
              >
                <Network className="w-5 h-5" style={{ color: design.secondaryColor }} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{ color: design.secondaryColor }}>
                  Eixo Temático 1
                </span>
                <h4 className="text-xs font-extrabold leading-tight mt-0.5" style={{ color: design.primaryColor }}>
                  Fluxograma da RAPS
                </h4>
                <p className="text-[10px] text-stone-600 leading-tight mt-1">
                  Acolhimento, regulação e linhas de cuidado territorializado.
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-2xl bg-white/90 border-2 shadow-2xs flex items-start gap-3"
              style={{ borderColor: `${design.accentColor}4d` }}
            >
              <div
                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${design.accentColor}18`, borderColor: `${design.accentColor}55` }}
              >
                <Building2 className="w-5 h-5" style={{ color: design.accentColor }} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{ color: design.accentColor }}>
                  Eixo Temático 2
                </span>
                <h4 className="text-xs font-extrabold leading-tight mt-0.5" style={{ color: design.primaryColor }}>
                  Hospital Geral, Leitos e Urgência
                </h4>
                <p className="text-[10px] text-stone-600 leading-tight mt-1">
                  Leitos de retaguarda e pronto socorro na nossa microrregião.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/90 border-2 border-[#6a4c93]/30 shadow-2xs flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f3eef8] border border-[#6a4c93]/40 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-[#6a4c93]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6a4c93] block">
                  Eixo Temático 3
                </span>
                <h4 className="text-xs font-extrabold leading-tight mt-0.5" style={{ color: design.primaryColor }}>
                  Judiciarização & Cuidado em Liberdade
                </h4>
                <p className="text-[10px] text-stone-600 leading-tight mt-1">
                  Direitos humanos, Lei 10.216/2001 e desinstitucionalização.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENT SUMMARY INFO */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 my-2 text-stone-800 font-sans">
        <div className="flex items-center gap-2 bg-white/85 border border-stone-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-bold">
          <Calendar className="w-4 h-4" style={{ color: design.accentColor }} />
          <span>{config.eventFullDate}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/85 border border-stone-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-bold">
          <Clock className="w-4 h-4" style={{ color: design.secondaryColor }} />
          <span>{config.eventHours}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/85 border border-stone-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-bold">
          <MapPin className="w-4 h-4" style={{ color: design.secondaryColor }} />
          <span>{config.locationName}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/85 border border-stone-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-bold">
          <Award className="w-4 h-4" style={{ color: design.accentColor }} />
          <span>Carga Horária: {config.certificateWorkload} Horas</span>
        </div>
      </div>

      {/* SIGNATURES & DIGITAL VALIDATION QR */}
      <div className="relative z-10 pt-6 mt-4 border-t border-stone-300/80 grid grid-cols-1 sm:grid-cols-12 gap-5 items-end font-sans">
        <div className={`${design.showQrValidation ? 'sm:col-span-8' : 'sm:col-span-12'} grid grid-cols-1 sm:grid-cols-2 gap-4 text-center`}>
          {/* Signature 1 */}
          <div className="bg-white/65 p-3 rounded-xl border border-stone-200/80">
            <div className="h-9 flex items-center justify-center">
              <span className="font-serif italic font-bold text-stone-700 text-sm tracking-wide">
                {design.signature1Name}
              </span>
            </div>
            <div className="w-36 sm:w-44 h-0.5 bg-stone-500 mx-auto mb-1.5" />
            <div className="text-xs font-extrabold leading-tight" style={{ color: design.primaryColor }}>
              {design.signature1Role}
            </div>
            <div className="text-[10px] text-stone-600">{design.signature1Org}</div>
          </div>

          {/* Signature 2 */}
          <div className="bg-white/65 p-3 rounded-xl border border-stone-200/80">
            <div className="h-9 flex items-center justify-center">
              <span className="font-serif italic font-bold text-stone-700 text-sm tracking-wide">
                {design.signature2Name}
              </span>
            </div>
            <div className="w-36 sm:w-44 h-0.5 bg-stone-500 mx-auto mb-1.5" />
            <div className="text-xs font-extrabold leading-tight" style={{ color: design.primaryColor }}>
              {design.signature2Role}
            </div>
            <div className="text-[10px] text-stone-600">{design.signature2Org}</div>
          </div>
        </div>

        {design.showQrValidation && (
          <div className="sm:col-span-4 bg-white/95 p-3 rounded-xl border border-stone-300/80 shadow-2xs flex items-center gap-3">
            <div className="p-1 rounded-lg border border-stone-200 shrink-0" style={{ backgroundColor: `${design.primaryColor}0d` }}>
              <QrCode className="w-12 h-12" style={{ color: design.primaryColor }} />
            </div>
            <div className="text-[10px] text-stone-600 leading-tight min-w-0">
              <div className="font-bold flex items-center gap-1" style={{ color: design.primaryColor }}>
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Autenticação Digital:</span>
              </div>
              <div className="font-mono font-bold text-stone-900 text-[8.5px] mt-1 break-all bg-stone-50 p-1 rounded border border-stone-200">
                {generateCertificateHash(attendee.code, attendee.cpf)}
              </div>
              <div className="text-[8.5px] text-stone-500 mt-1">
                Conforme Lei 10.216/2001 e normas do SUS/MG
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ARTWORK: SINUOUS 3 WAVES */}
      {design.showBottomWaves && (
        <div className="relative mt-6 -mx-5 sm:-mx-10 -mb-5 sm:-mb-10 pointer-events-none overflow-hidden select-none">
          <div className="w-full h-14 sm:h-18">
            <svg
              viewBox="0 0 1440 180"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <path
                d="M 0 90 C 280 40 480 140 800 90 C 1120 40 1300 100 1440 70 L 1440 180 L 0 180 Z"
                fill={design.accentColor}
                opacity="0.95"
              />
              <path
                d="M 0 110 C 320 60 520 160 860 105 C 1180 50 1340 130 1440 95 L 1440 180 L 0 180 Z"
                fill={design.secondaryColor}
                opacity="0.95"
              />
              <path
                d="M 0 130 C 360 95 600 175 940 125 C 1220 80 1380 140 1440 120 L 1440 180 L 0 180 Z"
                fill={design.primaryColor}
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
