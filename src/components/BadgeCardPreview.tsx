import React from 'react';
import { Registration, EventConfig, BadgeDesignConfig } from '../types.ts';
import { getBadgeDesign } from '../utils/helpers.ts';
import { buildBadgeQrSvg } from '../utils/badgePrintGenerator.ts';

interface BadgeCardPreviewProps {
  registration: Registration;
  config: EventConfig;
  designOverride?: BadgeDesignConfig;
}

export const BadgeCardPreview: React.FC<BadgeCardPreviewProps> = ({
  registration,
  config,
  designOverride
}) => {
  const design = designOverride || getBadgeDesign(config);
  const isPresent = registration.status === 'presente';
  const statusLabel = isPresent ? design.accreditedBadgeLabel : design.pendingBadgeLabel;
  const isStripe = design.layoutTheme === 'modern_stripe';
  const isMinimal = design.layoutTheme === 'minimal_card';

  const topHeaderStyle: React.CSSProperties = isMinimal
    ? {
        backgroundColor: design.backgroundColor,
        color: design.primaryColor,
        borderBottom: `3px solid ${design.accentColor}`
      }
    : isStripe
    ? {
        background: `linear-gradient(135deg, ${design.primaryColor} 0%, ${design.secondaryColor} 100%)`,
        color: '#ffffff',
        borderBottom: `3px solid ${design.accentColor}`
      }
    : {
        backgroundColor: design.primaryColor,
        color: '#ffffff',
        borderBottom: `3px solid ${design.accentColor}`
      };

  const qrSvgMarkup = buildBadgeQrSvg(registration.code, design.primaryColor);

  return (
    <div
      className="relative mx-auto w-full rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all"
      style={{
        maxWidth: design.paperFormat === 'card' ? '315px' : '345px',
        minHeight: design.paperFormat === 'card' ? '435px' : '470px',
        backgroundColor: design.backgroundColor,
        color: design.textColor,
        border: `2px solid ${isMinimal ? '#cbd5e1' : design.primaryColor}`
      }}
    >
      {/* Left vertical accent bar on modern_stripe */}
      {isStripe && (
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-2 z-10"
          style={{
            background: `linear-gradient(180deg, ${design.accentColor}, ${design.secondaryColor})`
          }}
        />
      )}

      <div>
        {/* Top Institutional Header */}
        <div className="px-4 py-3.5 text-center relative" style={topHeaderStyle}>
          {design.showLanyardSlot && (
            <div
              aria-hidden="true"
              className="w-12 h-2.5 rounded-full mx-auto mb-2.5"
              style={{
                backgroundColor: isMinimal ? '#e2e8f0' : 'rgba(255,255,255,0.28)',
                border: `1px solid ${isMinimal ? '#cbd5e1' : 'rgba(255,255,255,0.45)'}`
              }}
            />
          )}

          <div className="flex items-center justify-center gap-2.5">
            {design.showLogo && (
              <div
                className="w-10 h-10 rounded-full bg-white p-0.5 shrink-0 overflow-hidden shadow-xs"
                style={{ border: `1.5px solid ${design.accentColor}` }}
              >
                <img
                  src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                  alt="Logo SUS"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            )}
            <div className={design.showLogo ? 'text-left min-w-0' : 'text-center min-w-0'}>
              <div
                className="text-[9px] font-extrabold uppercase tracking-wider leading-tight truncate"
                style={{ color: isMinimal ? design.accentColor : '#ffd2b3' }}
              >
                {design.headerLabel}
              </div>
              <div className="text-xs sm:text-sm font-black leading-tight mt-0.5 truncate">
                {config.editionTitle}
              </div>
              <div className="text-[10px] opacity-90 leading-tight mt-0.5 truncate">
                {design.subHeaderLabel} · {config.eventDate}
              </div>
            </div>
          </div>
        </div>

        {/* Participant Identity Center */}
        <div
          className={`px-5 pt-4 pb-3 text-center ${isStripe ? 'pl-6' : ''}`}
        >
          <span
            className="inline-block px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-white shadow-2xs mb-2.5"
            style={{ backgroundColor: isPresent ? '#059669' : '#d97706' }}
          >
            {statusLabel}
          </span>

          <h3
            className="text-xl font-black leading-tight break-words"
            style={{ color: design.primaryColor }}
          >
            {registration.fullName}
          </h3>

          <div
            className="text-xs sm:text-sm font-extrabold mt-1.5"
            style={{ color: design.accentColor }}
          >
            {registration.professionalRole}
          </div>

          {design.showInstitution && registration.institution && (
            <div className="text-xs text-slate-600 font-medium mt-1 leading-snug">
              {registration.institution}
            </div>
          )}

          {design.showCity && registration.city && (
            <div
              className="inline-block mt-2 px-3 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 border border-slate-200"
              style={{ color: design.primaryColor }}
            >
              {registration.city} - MG
            </div>
          )}

          {design.showAxisInterest && registration.axisInterest && (
            <div
              className="mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold leading-snug"
              style={{
                backgroundColor: `${design.secondaryColor}14`,
                border: `1px solid ${design.secondaryColor}35`,
                color: design.primaryColor
              }}
            >
              {registration.axisInterest}
            </div>
          )}

          {design.showCareLevel && registration.susCareLevel && (
            <div className="mt-1.5 text-[10px] text-slate-500 font-medium">
              {registration.susCareLevel.split('/')[0]}
            </div>
          )}
        </div>
      </div>

      {/* QR Code & Footer Strip */}
      <div>
        <div
          className={`mx-4 mb-3 p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center gap-3 ${
            design.showQrCode ? 'justify-between' : 'justify-center'
          } ${isStripe ? 'ml-5' : ''}`}
        >
          {design.showQrCode && (
            <div
              className="w-14 h-14 p-1 bg-white rounded-lg border border-slate-300 shrink-0"
              dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
            />
          )}
          <div className={design.showQrCode ? 'text-left flex-1 min-w-0' : 'text-center flex-1'}>
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
              Código de Credenciamento
            </div>
            <div
              className="font-mono text-base font-black tracking-tight mt-0.5"
              style={{ color: design.primaryColor }}
            >
              {registration.code}
            </div>
            <div className="text-[9px] text-slate-500 truncate mt-0.5">
              {config.eventHours || '7h30 às 16h30'} · {config.locationName}
            </div>
          </div>
        </div>

        <div
          className="px-3 py-2 text-center text-[10px] font-bold tracking-wide text-white"
          style={{ backgroundColor: design.primaryColor }}
        >
          {design.footerLabel}
        </div>
      </div>
    </div>
  );
};
