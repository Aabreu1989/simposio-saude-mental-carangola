import { Registration, EventConfig } from '../types.ts';
import {
  generateCertificateHash,
  formatCPF,
  getCertificateDesign,
  sanitizeCertificateBannerUrl,
  formatCertificateBodyText
} from './helpers.ts';

const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const safeCssColor = (color: string | undefined, fallback: string): string => {
  const clean = (color || '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(clean) ? clean : fallback;
};

export const generateCertificateHTML = (
  attendee: Registration,
  config: EventConfig
): string => {
  const hash = generateCertificateHash(attendee.code, attendee.cpf || '');
  const cpfDigits = (attendee.cpf || '').replace(/\D/g, '');
  const hasValidCpf = cpfDigits.length === 11;
  const formattedCpf = hasValidCpf ? formatCPF(attendee.cpf) : attendee.code;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const design = getCertificateDesign(config);
  const bodyText = formatCertificateBodyText(design.bodyTemplate, config);

  const primaryColor = safeCssColor(design.primaryColor, '#0a3641');
  const accentColor = safeCssColor(design.accentColor, '#ea7a38');
  const secondaryColor = safeCssColor(design.secondaryColor, '#028090');
  const backgroundColor = safeCssColor(design.backgroundColor, '#ffffff');

  const safeCleanBanner = design.showBannerImage
    ? sanitizeCertificateBannerUrl(design.bannerImageUrl)
    : '';
  const bannerSrc = safeCleanBanner
    ? safeCleanBanner.startsWith('http')
      ? safeCleanBanner
      : `${origin}${safeCleanBanner}`
    : '';

  const fontStack =
    design.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", Times, serif'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const borderWidth = design.borderStyle === 'minimal' ? '2px' : design.borderStyle === 'classic' ? '6px' : '8px';
  const isClassic = design.layoutTheme === 'institutional_classic';
  const isModernClean = design.layoutTheme === 'modern_clean';
  const isRapsWaves = !isClassic && !isModernClean;
  const sheetNum = attendee.code.replace(/\D/g, '') || '01';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Certificado Oficial - ${escapeHtml(attendee.fullName)} - ${escapeHtml(attendee.code)}</title>
  <style>
    @page {
      size: A4 landscape !important;
      margin: 0 !important;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: ${fontStack};
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: ${backgroundColor};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Screen Top Control Bar (Hidden in Print) */
    .screen-control-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: ${primaryColor};
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      border-bottom: 3px solid ${accentColor};
    }
    .screen-control-bar .title {
      font-size: 11pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .screen-control-bar .actions {
      display: flex;
      gap: 10px;
    }
    .btn-action {
      background: ${accentColor};
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 9.5pt;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-action:hover {
      opacity: 0.9;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Certificate Outer Frame */
    .certificate-sheet {
      width: 100%;
      max-width: 1120px;
      margin: 15px auto;
      background: ${backgroundColor};
      border: ${borderWidth} solid ${primaryColor};
      border-radius: 20px;
      padding: 22px 32px 18px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .theme-top-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${accentColor});
    }
    .theme-left-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 6px;
      background: linear-gradient(180deg, ${primaryColor}, ${accentColor});
    }

    /* Inner Border */
    .inner-border {
      position: absolute;
      inset: 8px;
      border: ${design.borderStyle === 'classic' ? '1px' : '2px'} solid ${accentColor}73;
      border-radius: 12px;
      pointer-events: none;
      display: ${design.borderStyle === 'minimal' ? 'none' : 'block'};
    }
    .inner-border-secondary {
      position: absolute;
      inset: 13px;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      pointer-events: none;
      display: ${design.borderStyle === 'double' ? 'block' : 'none'};
    }

    /* Watermark Background */
    .watermark {
      position: absolute;
      inset: 0;
      display: ${design.showWatermark ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
      font-size: 160px;
      font-weight: 900;
      color: ${primaryColor};
      opacity: 0.035;
      pointer-events: none;
      user-select: none;
      letter-spacing: -4px;
      text-transform: uppercase;
    }

    .cert-banner-strip {
      width: 100%;
      max-height: 46px;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 8px;
    }
    .cert-banner-strip img {
      width: 100%;
      height: 46px;
      object-fit: cover;
      display: block;
    }

    /* Header Authorities Bar */
    .auth-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 10px;
      position: relative;
      z-index: 2;
    }
    .auth-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sus-logo-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid ${accentColor};
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      flex-shrink: 0;
    }
    .sus-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .sus-brasil-pill {
      display: inline-block;
      background: ${primaryColor};
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 900;
      padding: 1.5px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .auth-text-sup {
      font-size: 7pt;
      font-weight: 700;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .auth-text-main {
      font-size: 9pt;
      font-weight: 800;
      color: ${primaryColor};
      line-height: 1.2;
    }
    .auth-text-sub {
      font-size: 7.5pt;
      color: #64748b;
    }
    .reg-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 7.5pt;
      font-family: "Courier New", Courier, monospace;
      font-weight: 700;
      color: ${primaryColor};
    }

    /* Diploma Title & Recipient */
    .cert-heading-wrap {
      text-align: center;
      margin: 6px 0 6px 0;
      position: relative;
      z-index: 2;
    }
    .badge-label-pill {
      display: inline-block;
      background: ${secondaryColor};
      color: #ffffff;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 2px 10px;
      border-radius: 999px;
      margin-bottom: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .cert-title {
      font-size: 23pt;
      font-weight: 900;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 4px;
      margin: 0;
      line-height: 1.1;
      font-family: ${fontStack};
    }

    .cert-recipient-pre {
      font-size: 8.5pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 5px;
    }
    .cert-recipient-name {
      font-size: 19pt;
      font-weight: 900;
      color: ${primaryColor};
      display: inline-block;
      border-bottom: 2.5px solid ${accentColor};
      padding: 2px 14px;
      margin: 4px 0 6px 0;
      letter-spacing: -0.3px;
    }

    /* Recipient Metadata Chips */
    .recipient-meta-row {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
      position: relative;
      z-index: 2;
    }
    .meta-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 7.5pt;
      color: #334155;
    }
    .meta-chip strong {
      color: ${primaryColor};
    }

    /* Main Text Body */
    .cert-body-text {
      text-align: center;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #334155;
      max-width: 900px;
      margin: 0 auto 8px auto;
      position: relative;
      z-index: 2;
    }
    .cert-footer-quote {
      text-align: center;
      font-size: 8.5pt;
      font-style: italic;
      font-weight: 600;
      color: ${secondaryColor};
      margin: 0 auto 10px auto;
      position: relative;
      z-index: 2;
    }

    /* Thematic Axes Strip */
    .axes-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      max-width: 920px;
      margin: 0 auto 10px auto;
      position: relative;
      z-index: 2;
    }
    .axis-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 7pt;
      line-height: 1.25;
      border-top: 3px solid ${secondaryColor};
    }
    .axis-card.orange { border-top-color: ${accentColor}; }
    .axis-card.primary { border-top-color: ${primaryColor}; }
    .axis-label {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 6.5pt;
      display: block;
      margin-bottom: 2px;
    }
    .axis-title {
      font-weight: 800;
      color: ${primaryColor};
      font-size: 7.5pt;
    }

    /* Badges Row */
    .badges-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 10px;
      position: relative;
      z-index: 2;
    }
    .badge-item {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 7.5pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    /* Signatures & QR Code Section */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      margin-top: 6px;
      gap: 20px;
      position: relative;
      z-index: 2;
    }
    .sig-col {
      display: flex;
      gap: 24px;
      flex: 1;
    }
    .sig-block {
      flex: 1;
      text-align: center;
      border-top: 1px solid #475569;
      padding-top: 4px;
      font-size: 7.5pt;
      color: #475569;
      line-height: 1.25;
    }
    .sig-name {
      font-weight: 800;
      color: ${primaryColor};
      font-size: 8pt;
    }

    .qr-block {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 7pt;
      line-height: 1.2;
      color: #64748b;
      flex-shrink: 0;
    }
    .qr-code-box {
      width: 42px;
      height: 42px;
      background: #ffffff;
      border: 1px solid ${primaryColor};
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 8pt;
      color: ${primaryColor};
    }
    .qr-text strong {
      color: ${primaryColor};
      display: block;
    }
    .qr-hash {
      font-family: "Courier New", Courier, monospace;
      font-weight: 700;
      color: ${primaryColor};
      font-size: 6.5pt;
      margin-top: 2px;
    }

    .bottom-waves-strip {
      margin-top: 8px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      z-index: 2;
      line-height: 0;
    }

    /* Print Overrides: Exact A4 Landscape (297mm x 210mm) */
    @media print {
      @page {
        size: A4 landscape !important;
        margin: 0 !important;
      }
      .screen-control-bar {
        display: none !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        background: #ffffff !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .certificate-sheet {
        box-shadow: none !important;
        margin: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        max-width: 297mm !important;
        max-height: 210mm !important;
        border-width: ${borderWidth} !important;
        border-radius: 0 !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Top Bar (Hidden in Print) -->
  <div class="screen-control-bar">
    <div class="title">
      <span>🎓 Certificado Oficial de Participação · ${escapeHtml(attendee.fullName)}</span>
    </div>
    <div class="actions">
      <button class="btn-action" onclick="window.print()">
        🖨️ Salvar como PDF / Imprimir
      </button>
      <button class="btn-action btn-secondary" onclick="window.close()">
        ✕ Fechar
      </button>
    </div>
  </div>

  <div class="certificate-sheet">
    ${isRapsWaves ? '<div class="theme-top-bar"></div>' : ''}
    ${isModernClean ? '<div class="theme-left-bar"></div>' : ''}
    <div class="inner-border"></div>
    <div class="inner-border-secondary"></div>
    <div class="watermark">${escapeHtml(design.watermarkText || 'SUS')}</div>

    ${bannerSrc ? `
    <div class="cert-banner-strip">
      <img src="${escapeHtml(bannerSrc)}" alt="Banner Institucional do Certificado" />
    </div>
    ` : ''}

    <!-- Top Authority Bar -->
    <div class="auth-header">
      <div class="auth-brand">
        <div class="sus-logo-circle">
          <img
            src="${escapeHtml(origin)}/assets/logo-sus-oficial.jpg"
            alt="Logo Oficial SUS"
            class="sus-logo-img"
            onerror="this.src='/favicon-192x192.png'"
          />
        </div>
        <div>
          <div><span class="sus-brasil-pill">SUS BRASIL</span></div>
          <div class="auth-text-sup">${escapeHtml(design.institutionTopLine)}</div>
          <div class="auth-text-main">${escapeHtml(design.institutionName)}</div>
          <div class="auth-text-sub">${escapeHtml(design.institutionSub)}</div>
        </div>
      </div>
      <div class="reg-chip">
        LIVRO RAPS-2026 · Fl. ${escapeHtml(sheetNum)} · REG: ${escapeHtml(attendee.code)}
      </div>
    </div>

    <!-- Diploma Heading -->
    <div class="cert-heading-wrap">
      ${design.badgeLabel && design.badgeLabel.trim() !== '' ? `<div class="badge-label-pill">${escapeHtml(design.badgeLabel)}</div>` : ''}
      <h1 class="cert-title">${escapeHtml(design.mainTitle || 'CERTIFICADO')}</h1>
      <div class="cert-recipient-pre">${escapeHtml(design.preNameText || 'Certificamos formalmente que')}</div>
      <div class="cert-recipient-name">${escapeHtml(attendee.fullName.toUpperCase())}</div>
    </div>

    <!-- Recipient Meta Row -->
    <div class="recipient-meta-row">
      <div class="meta-chip">${hasValidCpf ? 'CPF' : 'Identificação'}: <strong>${escapeHtml(formattedCpf)}</strong></div>
      <div class="meta-chip">Função: <strong>${escapeHtml(attendee.professionalRole)}</strong></div>
      <div class="meta-chip">Município: <strong>${escapeHtml(attendee.city)} - MG</strong></div>
      <div class="meta-chip">Inscrição: <strong>${escapeHtml(attendee.code)}</strong></div>
    </div>

    <!-- Formal Declaration Text -->
    <div class="cert-body-text">
      ${escapeHtml(bodyText)}
    </div>

    ${design.footerQuote && design.footerQuote.trim() !== '' ? `
    <div class="cert-footer-quote">
      “${escapeHtml(design.footerQuote)}”
    </div>
    ` : ''}

    ${design.showThematicAxes ? `
    <!-- 3 Strategic Axes Row -->
    <div class="axes-row">
      <div class="axis-card">
        <span class="axis-label" style="color: ${secondaryColor};">Eixo Temático 1</span>
        <span class="axis-title">Fluxograma da RAPS</span>
        <div>Acolhimento, regulação e integração com a Atenção Básica.</div>
      </div>
      <div class="axis-card orange">
        <span class="axis-label" style="color: ${accentColor};">Eixo Temático 2</span>
        <span class="axis-title">Hospital Geral &amp; Leitos</span>
        <div>Urgência psiquiátrica e retaguarda clínica no território.</div>
      </div>
      <div class="axis-card primary">
        <span class="axis-label" style="color: ${primaryColor};">Eixo Temático 3</span>
        <span class="axis-title">Judicialização &amp; Liberdade</span>
        <div>Direitos humanos, Lei 10.216/2001 e desinstitucionalização.</div>
      </div>
    </div>
    ` : ''}

    <!-- Logistics Badges -->
    <div class="badges-row">
      <div class="badge-item">📅 ${escapeHtml(config.eventFullDate)}</div>
      <div class="badge-item">⏰ ${escapeHtml(config.eventHours)}</div>
      <div class="badge-item">📍 ${escapeHtml(config.locationName)}</div>
      <div class="badge-item">🎓 Carga Horária: ${escapeHtml(config.certificateWorkload)}h</div>
    </div>

    <!-- Signatures & QR Authentication -->
    <div class="signatures-row">
      <div class="sig-col">
        <div class="sig-block">
          <div class="sig-name">${escapeHtml(design.signature1Name)}</div>
          <div><strong>${escapeHtml(design.signature1Role)}</strong></div>
          <div>${escapeHtml(design.signature1Org)}</div>
        </div>
        <div class="sig-block">
          <div class="sig-name">${escapeHtml(design.signature2Name)}</div>
          <div><strong>${escapeHtml(design.signature2Role)}</strong></div>
          <div>${escapeHtml(design.signature2Org)}</div>
        </div>
      </div>

      ${design.showQrValidation ? `
      <div class="qr-block">
        <div class="qr-code-box">SUS</div>
        <div class="qr-text">
          <strong>Autenticação Digital SUS</strong>
          <div class="qr-hash">${escapeHtml(hash)}</div>
          <div>Validado conforme Lei Federal 10.216/2001</div>
        </div>
      </div>
      ` : ''}
    </div>

    ${design.showBottomWaves ? `
    <div class="bottom-waves-strip">
      <svg viewBox="0 0 1200 28" preserveAspectRatio="none" style="width:100%;height:14px;display:block;">
        <path d="M0,18 C220,4 420,28 640,14 C860,0 1040,24 1200,10 L1200,28 L0,28 Z" fill="${primaryColor}" fill-opacity="0.85" />
        <path d="M0,22 C260,10 520,28 780,16 C980,8 1100,22 1200,16 L1200,28 L0,28 Z" fill="${secondaryColor}" fill-opacity="0.7" />
        <path d="M0,25 C340,18 620,28 920,20 C1080,16 1150,24 1200,22 L1200,28 L0,28 Z" fill="${accentColor}" fill-opacity="0.8" />
      </svg>
    </div>
    ` : ''}

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;
};

export const openCertificatePrintWindow = (
  attendee: Registration,
  config: EventConfig
): boolean => {
  try {
    const html = generateCertificateHTML(attendee, config);
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
      return false;
    }

    doc.open();
    doc.write(html.replace(/<script>[\s\S]*?<\/script>/gi, ''));
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 2500);
      }
    }, 350);

    return true;
  } catch (err) {
    console.warn('Could not open iframe print:', err);
    return false;
  }
};

export const downloadCertificateHTML = (
  attendee: Registration,
  config: EventConfig
): void => {
  const html = generateCertificateHTML(attendee, config);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = attendee.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `certificado_sus_${cleanName}_${attendee.code}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) link.parentNode.removeChild(link);
    URL.revokeObjectURL(url);
  }, 10000);
};
