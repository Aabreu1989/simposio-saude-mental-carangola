import { Registration, EventConfig } from '../types.ts';
import {
  generateCertificateHash,
  formatCPF,
  getCertificateDesign,
  formatCertificateBodyText
} from './helpers.ts';

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
  const rawBanner = design.bannerImageUrl || config.bannerImage || '/assets/banner-oficial-simposio-saude-mental-carangola.jpg';
  const bannerSrc = rawBanner.startsWith('http') || rawBanner.startsWith('data:')
    ? rawBanner
    : `${origin}${rawBanner.startsWith('/') ? '' : '/'}${rawBanner}`;
  const fontStack =
    design.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", Times, serif'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const borderWidth = design.borderStyle === 'minimal' ? '3px' : design.borderStyle === 'classic' ? '8px' : '10px';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Certificado Oficial - ${attendee.fullName} - ${attendee.code}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: ${fontStack};
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: ${design.backgroundColor};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Screen Top Control Bar (Hidden in Print) */
    .screen-control-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: ${design.primaryColor};
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      border-bottom: 3px solid ${design.accentColor};
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
      background: ${design.accentColor};
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
      background: ${design.backgroundColor};
      border: ${borderWidth} solid ${design.primaryColor};
      border-radius: 20px;
      padding: 24px 34px 20px 34px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
    }

    /* Inner Border */
    .inner-border {
      position: absolute;
      inset: 8px;
      border: 2px solid ${design.accentColor}73;
      border-radius: 12px;
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
      font-size: 180px;
      font-weight: 900;
      color: ${design.primaryColor};
      opacity: 0.03;
      pointer-events: none;
      user-select: none;
      letter-spacing: -6px;
    }

    /* Header Authorities Bar */
    .auth-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .auth-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sus-logo-circle {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      border: 2px solid ${design.accentColor};
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
      background: ${design.primaryColor};
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
      color: ${design.accentColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .auth-text-main {
      font-size: 9pt;
      font-weight: 800;
      color: ${design.primaryColor};
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
      color: ${design.primaryColor};
    }

    /* Diploma Title & Recipient */
    .cert-heading-wrap {
      text-align: center;
      margin: 10px 0 8px 0;
    }
    .cert-title {
      font-size: 24pt;
      font-weight: 900;
      color: ${design.primaryColor};
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
      margin-top: 6px;
    }
    .cert-recipient-name {
      font-size: 20pt;
      font-weight: 900;
      color: ${design.primaryColor};
      display: inline-block;
      border-bottom: 2.5px solid ${design.accentColor};
      padding: 2px 14px;
      margin: 4px 0 6px 0;
      letter-spacing: -0.3px;
    }

    /* Recipient Metadata Chips */
    .recipient-meta-row {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
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
      color: #0a3641;
    }

    /* Main Text Body */
    .cert-body-text {
      text-align: center;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #334155;
      max-width: 900px;
      margin: 0 auto 12px auto;
    }
    .cert-body-text strong {
      color: #0a3641;
    }

    /* Thematic Axes Strip */
    .axes-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      max-width: 920px;
      margin: 0 auto 12px auto;
    }
    .axis-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 7pt;
      line-height: 1.25;
      border-top: 3px solid #028090;
    }
    .axis-card.orange { border-top-color: #ea7a38; }
    .axis-card.purple { border-top-color: #6a4c93; }
    .axis-label {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 6.5pt;
      display: block;
      margin-bottom: 2px;
    }
    .axis-title {
      font-weight: 800;
      color: #0a3641;
      font-size: 7.5pt;
    }

    /* Badges Row */
    .badges-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .badge-item {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 7.5pt;
      font-weight: 700;
      color: #0a3641;
    }

    /* Signatures & QR Code Section */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 8px;
      gap: 20px;
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
      color: #0a3641;
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
      shrink: 0;
    }
    .qr-code-box {
      width: 44px;
      height: 44px;
      background: #ffffff;
      border: 1px solid #0a3641;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 8pt;
      color: #0a3641;
    }
    .qr-text strong {
      color: #0a3641;
      display: block;
    }
    .qr-hash {
      font-family: "Courier New", Courier, monospace;
      font-weight: 700;
      color: #0a3641;
      font-size: 6.5pt;
      margin-top: 2px;
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
        border-width: 8px !important;
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
      <span>🎓 Certificado Oficial de Participação · ${attendee.fullName}</span>
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
    <div class="inner-border"></div>
    <div class="watermark">${design.watermarkText}</div>

    <!-- Top Authority Bar -->
    <div class="auth-header">
      <div class="auth-brand">
        <div class="sus-logo-circle">
          <img
            src="${origin}/assets/logo-sus-oficial.jpg"
            alt="Logo Oficial SUS"
            class="sus-logo-img"
            onerror="this.src='/favicon-192x192.png'"
          />
        </div>
        <div>
          <div><span class="sus-brasil-pill">SUS BRASIL</span></div>
          <div class="auth-text-sup">${design.institutionTopLine}</div>
          <div class="auth-text-main">${design.institutionName}</div>
          <div class="auth-text-sub">${design.institutionSub}</div>
        </div>
      </div>
      <div class="reg-chip">
        LIVRO RAPS-2026 · REG: ${attendee.code}
      </div>
    </div>

    <!-- Diploma Heading -->
    <div class="cert-heading-wrap">
      <h1 class="cert-title">CERTIFICADO</h1>
      <div class="cert-recipient-pre">${design.preNameText}</div>
      <div class="cert-recipient-name">${attendee.fullName.toUpperCase()}</div>
    </div>

    <!-- Recipient Meta Row -->
    <div class="recipient-meta-row">
      <div class="meta-chip">${hasValidCpf ? 'CPF' : 'Nº Participante'}: <strong>${formattedCpf}</strong></div>
      <div class="meta-chip">Função: <strong>${attendee.professionalRole}</strong></div>
      <div class="meta-chip">Município: <strong>${attendee.city} - MG</strong></div>
      <div class="meta-chip">Inscrição: <strong>${attendee.code}</strong></div>
    </div>

    <!-- Formal Declaration Text -->
    <div class="cert-body-text">
      ${bodyText}
    </div>

    ${design.showThematicAxes ? `
    <!-- 3 Strategic Axes Row -->
    <div class="axes-row">
      <div class="axis-card" style="border-top-color: ${design.secondaryColor};">
        <span class="axis-label" style="color: ${design.secondaryColor};">Eixo Temático 1</span>
        <span class="axis-title">Fluxograma da RAPS</span>
        <div>Acolhimento, regulação e integração com a Atenção Básica.</div>
      </div>
      <div class="axis-card orange" style="border-top-color: ${design.accentColor};">
        <span class="axis-label" style="color: ${design.accentColor};">Eixo Temático 2</span>
        <span class="axis-title">Hospital Geral & Leitos</span>
        <div>Urgência psiquiátrica e retaguarda clínica no território.</div>
      </div>
      <div class="axis-card purple">
        <span class="axis-label" style="color: #6a4c93;">Eixo Temático 3</span>
        <span class="axis-title">Judicialização & Liberdade</span>
        <div>Direitos humanos, Lei 10.216/2001 e desinstitucionalização.</div>
      </div>
    </div>
    ` : ''}

    <!-- Logistics Badges -->
    <div class="badges-row">
      <div class="badge-item">📅 ${config.eventFullDate}</div>
      <div class="badge-item">⏰ ${config.eventHours}</div>
      <div class="badge-item">📍 ${config.locationName}</div>
      <div class="badge-item">🎓 Carga Horária: ${config.certificateWorkload}h</div>
    </div>

    <!-- Signatures & QR Authentication -->
    <div class="signatures-row">
      <div class="sig-col">
        <div class="sig-block">
          <div class="sig-name">${design.signature1Name}</div>
          <div><strong>${design.signature1Role}</strong></div>
          <div>${design.signature1Org}</div>
        </div>
        <div class="sig-block">
          <div class="sig-name">${design.signature2Name}</div>
          <div><strong>${design.signature2Role}</strong></div>
          <div>${design.signature2Org}</div>
        </div>
      </div>

      ${design.showQrValidation ? `
      <div class="qr-block">
        <div class="qr-code-box">QR</div>
        <div class="qr-text">
          <strong>Autenticação Digital ICP-SUS</strong>
          <div class="qr-hash">${hash}</div>
          <div>Validado conforme Lei Federal 10.216/2001</div>
        </div>
      </div>
      ` : ''}
    </div>

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
