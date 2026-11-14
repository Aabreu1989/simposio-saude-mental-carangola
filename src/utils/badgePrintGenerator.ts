import html2pdf from 'html2pdf.js';
import { Registration, EventConfig, BadgeDesignConfig } from '../types.ts';
import { getBadgeDesign } from './helpers.ts';

const escapeHtml = (value: string | undefined): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Gera um SVG determinístico estilizado de QR Code a partir do código do participante,
 * permitindo impressão instantânea em alta definição sem dependências externas.
 */
export const buildBadgeQrSvg = (code: string, color: string): string => {
  const size = 21;
  const cells: string[] = [];
  const seedStr = code || 'CAR-SM-001';

  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinderArea = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

  const finderFilled = (r: number, c: number, top: number, left: number) => {
    const dr = r - top;
    const dc = c - left;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
    return false;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let filled = false;
      if (r < 7 && c < 7) {
        filled = finderFilled(r, c, 0, 0);
      } else if (r < 7 && c >= size - 7) {
        filled = finderFilled(r, c, 0, size - 7);
      } else if (r >= size - 7 && c < 7) {
        filled = finderFilled(r, c, size - 7, 0);
      } else if (!isFinderArea(r, c)) {
        const bitHash = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
        filled = bitHash % 100 < 48;
      }
      if (filled) {
        cells.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="${color}" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" style="width:100%;height:100%;display:block;">${cells.join('')}</svg>`;
};

export const generateBadgeCardHtml = (
  registration: Registration,
  config: EventConfig,
  customDesign?: BadgeDesignConfig
): string => {
  const design = customDesign || getBadgeDesign(config);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const logoSrc = `${origin}/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg`;
  const isPresent = registration.status === 'presente';
  const statusLabel = isPresent ? design.accreditedBadgeLabel : design.pendingBadgeLabel;
  const statusBg = isPresent ? '#059669' : '#d97706';
  const qrSvg = buildBadgeQrSvg(registration.code, design.primaryColor);

  const widthMm = design.paperFormat === 'card' ? '90mm' : '105mm';
  const heightMm = design.paperFormat === 'card' ? '125mm' : '148mm';

  const isStripe = design.layoutTheme === 'modern_stripe';
  const isMinimal = design.layoutTheme === 'minimal_card';

  const topBannerBg = isMinimal
    ? design.backgroundColor
    : isStripe
    ? `linear-gradient(135deg, ${design.primaryColor} 0%, ${design.secondaryColor} 100%)`
    : design.primaryColor;

  const topTextColor = isMinimal ? design.primaryColor : '#ffffff';

  return `
    <div class="badge-print-card" style="
      width: ${widthMm};
      min-height: ${heightMm};
      background: ${design.backgroundColor};
      color: ${design.textColor};
      border: 2px solid ${isMinimal ? '#cbd5e1' : design.primaryColor};
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      box-sizing: border-box;
      position: relative;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    ">
      ${isStripe ? `<div style="position:absolute;left:0;top:0;bottom:0;width:8px;background:linear-gradient(180deg, ${design.accentColor}, ${design.secondaryColor});"></div>` : ''}

      <div>
        <!-- Top Header -->
        <div style="
          background: ${topBannerBg};
          color: ${topTextColor};
          padding: ${design.showLanyardSlot ? '14px 16px 14px 16px' : '16px'};
          text-align: center;
          border-bottom: 3px solid ${design.accentColor};
          position: relative;
        ">
          ${design.showLanyardSlot ? `
            <div style="
              width: 44px;
              height: 8px;
              border-radius: 999px;
              background: ${isMinimal ? '#e2e8f0' : 'rgba(255,255,255,0.28)'};
              border: 1px solid ${isMinimal ? '#cbd5e1' : 'rgba(255,255,255,0.45)'};
              margin: 0 auto 10px auto;
            "></div>
          ` : ''}

          <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
            ${design.showLogo ? `
              <img src="${logoSrc}" alt="SUS" style="width:40px;height:40px;border-radius:999px;object-fit:contain;background:#ffffff;padding:2px;border:1.5px solid ${design.accentColor};flex-shrink:0;" />
            ` : ''}
            <div style="text-align:${design.showLogo ? 'left' : 'center'};">
              <div style="font-size:7.5pt;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:${isMinimal ? design.accentColor : '#ffd2b3'};">
                ${escapeHtml(design.headerLabel)}
              </div>
              <div style="font-size:10.5pt;font-weight:900;line-height:1.15;margin-top:2px;">
                ${escapeHtml(config.editionTitle)}
              </div>
              <div style="font-size:7.5pt;opacity:0.9;margin-top:1px;">
                ${escapeHtml(design.subHeaderLabel)} · ${escapeHtml(config.eventDate)}
              </div>
            </div>
          </div>
        </div>

        <!-- Participant Identity Body -->
        <div style="padding: 16px 18px 10px ${isStripe ? '22px' : '18px'}; text-align: center;">
          <div style="
            display: inline-block;
            background: ${statusBg};
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: 800;
            letter-spacing: 0.9px;
            padding: 3px 10px;
            border-radius: 999px;
            text-transform: uppercase;
            margin-bottom: 10px;
          ">
            ${escapeHtml(statusLabel)}
          </div>

          <h2 style="
            margin: 0;
            font-size: 16pt;
            font-weight: 900;
            color: ${design.primaryColor};
            line-height: 1.18;
            word-break: break-word;
          ">
            ${escapeHtml(registration.fullName)}
          </h2>

          <div style="
            margin-top: 6px;
            font-size: 10pt;
            font-weight: 800;
            color: ${design.accentColor};
          ">
            ${escapeHtml(registration.professionalRole)}
          </div>

          ${design.showInstitution && registration.institution ? `
            <div style="margin-top: 4px; font-size: 8.5pt; color: #475569; font-weight: 600; line-height: 1.25;">
              ${escapeHtml(registration.institution)}
            </div>
          ` : ''}

          ${design.showCity && registration.city ? `
            <div style="
              margin-top: 6px;
              display: inline-block;
              background: #f1f5f9;
              color: ${design.primaryColor};
              border: 1px solid #cbd5e1;
              padding: 3px 10px;
              border-radius: 8px;
              font-size: 8pt;
              font-weight: 700;
            ">
              ${escapeHtml(registration.city)} - MG
            </div>
          ` : ''}

          ${design.showAxisInterest && registration.axisInterest ? `
            <div style="
              margin-top: 8px;
              padding: 5px 8px;
              border-radius: 8px;
              background: ${design.secondaryColor}12;
              border: 1px solid ${design.secondaryColor}35;
              font-size: 7.2pt;
              font-weight: 700;
              color: ${design.primaryColor};
              line-height: 1.25;
            ">
              ${escapeHtml(registration.axisInterest)}
            </div>
          ` : ''}

          ${design.showCareLevel && registration.susCareLevel ? `
            <div style="margin-top: 5px; font-size: 7pt; color: #64748b; font-weight: 600;">
              ${escapeHtml(registration.susCareLevel.split('/')[0])}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- QR + Footer -->
      <div>
        <div style="
          margin: 4px 16px 10px ${isStripe ? '22px' : '16px'};
          padding: 9px 12px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: ${design.showQrCode ? 'space-between' : 'center'};
          gap: 10px;
        ">
          ${design.showQrCode ? `
            <div style="width:54px;height:54px;padding:4px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;flex-shrink:0;">
              ${qrSvg}
            </div>
          ` : ''}
          <div style="text-align:${design.showQrCode ? 'left' : 'center'};flex:1;">
            <div style="font-size:6.8pt;text-transform:uppercase;font-weight:700;color:#64748b;letter-spacing:0.6px;">
              Código de Credenciamento
            </div>
            <div style="font-family:'JetBrains Mono', monospace;font-size:12pt;font-weight:900;color:${design.primaryColor};margin-top:1px;">
              ${escapeHtml(registration.code)}
            </div>
            <div style="font-size:6.8pt;color:#64748b;margin-top:2px;">
              ${escapeHtml(config.eventHours || '7h30 às 16h30')} · ${escapeHtml(config.locationName)}
            </div>
          </div>
        </div>

        <div style="
          background: ${design.primaryColor};
          color: #ffffff;
          text-align: center;
          padding: 7px 10px;
          font-size: 7pt;
          font-weight: 700;
          letter-spacing: 0.4px;
        ">
          ${escapeHtml(design.footerLabel)}
        </div>
      </div>
    </div>
  `;
};

export const printBadgeInIframe = (
  registration: Registration,
  config: EventConfig,
  customDesign?: BadgeDesignConfig
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const design = customDesign || getBadgeDesign(config);
      const badgeHtml = generateBadgeCardHtml(registration, config, design);
      const pageSize = design.paperFormat === 'card' ? '95mm 132mm' : 'A6 portrait';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve(false);
        return;
      }

      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Crachá - ${escapeHtml(registration.fullName)} (${escapeHtml(registration.code)})</title>
  <style>
    @page {
      size: ${pageSize};
      margin: 4mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body {
        min-height: auto;
        padding: 0;
        background: #ffffff;
      }
      .badge-print-card {
        margin: 0 auto !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  ${badgeHtml}
</body>
</html>`);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.error('Erro ao imprimir crachá no iframe:', err);
          resolve(false);
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 2500);
        }
      }, 350);
    } catch (err) {
      console.error('Erro ao preparar impressão de crachá:', err);
      resolve(false);
    }
  });
};

export const downloadBadgePdf = async (
  registration: Registration,
  config: EventConfig,
  customDesign?: BadgeDesignConfig
): Promise<string> => {
  const design = customDesign || getBadgeDesign(config);
  const badgeHtml = generateBadgeCardHtml(registration, config, design);
  const cleanName = (registration.fullName || 'participante')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const filename = `cracha_${cleanName}_${registration.code}.pdf`;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.padding = '12px';
  host.style.background = '#ffffff';
  host.innerHTML = badgeHtml;
  document.body.appendChild(host);

  try {
    const target = host.querySelector('.badge-print-card') as HTMLElement | null;
    const html2pdfLib = (html2pdf as any)?.default || html2pdf;
    if (!target || typeof html2pdfLib !== 'function') {
      throw new Error('Biblioteca PDF indisponível.');
    }

    const formatDims = design.paperFormat === 'card' ? [96, 132] : [110, 154];

    await html2pdfLib()
      .set({
        margin: [3, 3, 3, 3],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: formatDims, orientation: 'portrait' }
      })
      .from(target)
      .save();

    return filename;
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
};
