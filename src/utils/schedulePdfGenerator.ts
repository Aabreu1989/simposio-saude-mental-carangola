import { ScheduleSession, ThematicAxis, EventConfig } from '../types.ts';
import { INITIAL_EVENT_CONFIG } from '../data/initialData.ts';

export const generateScheduleHTML = (
  sessions: ScheduleSession[],
  axes: ThematicAxis[],
  config: EventConfig = INITIAL_EVENT_CONFIG
): string => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getAxisName = (axisId?: string) => {
    if (!axisId) return null;
    const ax = axes.find(a => a.id === axisId);
    return ax ? `Eixo ${ax.number}: ${ax.shortTitle || ax.title}` : null;
  };

  const getTypeBadge = (type: ScheduleSession['type']) => {
    switch (type) {
      case 'credenciamento':
        return '<span class="badge badge-teal">Acolhimento & Credenciamento</span>';
      case 'abertura':
        return '<span class="badge badge-navy">Mesa Solene</span>';
      case 'mesa':
        return '<span class="badge badge-orange">Mesa Redonda & Debate</span>';
      case 'intervalo':
        return '<span class="badge badge-amber">Intervalo / Pôsteres</span>';
      case 'plenaria':
        return '<span class="badge badge-purple">Plenária Deliberativa</span>';
      case 'encerramento':
        return '<span class="badge badge-emerald">Encerramento & Certificados</span>';
      default:
        return '<span class="badge badge-navy">Atividade</span>';
    }
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Programa Oficial - 1º Simpósio de Saúde Mental de Carangola</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 9pt;
      line-height: 1.4;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed Top Control Bar for Screen */
    .screen-control-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0a3641;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-bottom: 3px solid #ea7a38;
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
      background: #ea7a38;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10pt;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-action:hover {
      background: #d96522;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Print Document Container */
    .document-page {
      max-width: 860px;
      margin: 0 auto;
      padding: 15px 25px 30px 25px;
    }

    /* Official Header */
    .header {
      border-bottom: 2.5px solid #0a3641;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .header-logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0a3641;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .header-title {
      font-size: 16pt;
      font-weight: 900;
      color: #0a3641;
      margin: 0;
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: -0.3px;
    }
    .header-subtitle {
      font-size: 9.5pt;
      font-weight: 700;
      color: #ea7a38;
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #475569;
      line-height: 1.35;
      border-left: 1px solid #cbd5e1;
      padding-left: 14px;
      shrink: 0;
      white-space: nowrap;
    }
    .header-meta strong {
      color: #0a3641;
    }

    /* Meta Logistics Strip */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .meta-item {
      border-right: 1px solid #e2e8f0;
      padding-right: 8px;
    }
    .meta-item:last-child {
      border-right: none;
      padding-right: 0;
    }
    .meta-label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .meta-val {
      font-size: 9pt;
      font-weight: 700;
      color: #0a3641;
      margin-top: 2px;
      line-height: 1.25;
    }

    /* Thematic Axes Banner */
    .axes-box {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-left: 4px solid #ea7a38;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .axes-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0a3641;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .axes-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      font-size: 7.5pt;
      color: #334155;
    }
    .axes-item {
      line-height: 1.25;
    }
    .axes-item strong {
      color: #0a3641;
      display: block;
    }

    /* Section Separator */
    .schedule-heading {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0a3641;
      border-bottom: 2px solid #0a3641;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .schedule-heading span.badge-info {
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: none;
      color: #64748b;
    }

    /* Sessions Table / Cards */
    .session-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 8px;
      page-break-inside: avoid;
      background: #ffffff;
      overflow: hidden;
    }
    .session-header {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .session-time {
      font-family: "Courier New", Courier, monospace;
      font-size: 9.5pt;
      font-weight: 800;
      color: #0a3641;
      background: #ffffff;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    .session-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid transparent;
    }
    .badge-teal { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .badge-navy { background: #e2e8f0; color: #0f172a; border-color: #cbd5e1; }
    .badge-orange { background: #ffedd5; color: #c2410c; border-color: #fed7aa; }
    .badge-amber { background: #fef3c7; color: #b45309; border-color: #fde68a; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; border-color: #e9d5ff; }
    .badge-emerald { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }

    .session-body {
      padding: 8px 10px;
    }
    .session-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0a3641;
      margin: 0 0 4px 0;
      line-height: 1.25;
    }
    .session-desc {
      font-size: 8pt;
      color: #334155;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .session-loc {
      font-size: 7.5pt;
      color: #64748b;
      margin-bottom: 4px;
    }
    .session-loc strong {
      color: #0a3641;
    }

    /* Speakers Box */
    .speakers-container {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 4px;
      padding: 6px 8px;
      margin-top: 6px;
    }
    .speakers-heading {
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #78716c;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .speakers-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 12px;
    }
    .speaker-item {
      font-size: 7.5pt;
      line-height: 1.2;
    }
    .speaker-name {
      font-weight: 700;
      color: #0a3641;
    }
    .speaker-role {
      color: #57534e;
    }
    .speaker-inst {
      color: #78716c;
      font-style: italic;
    }

    /* Guidelines and Participant Rules */
    .rules-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .rules-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0a3641;
      margin-bottom: 4px;
    }
    .rules-text {
      font-size: 7pt;
      color: #475569;
      line-height: 1.35;
    }

    /* Signatures Section */
    .signatures {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      page-break-inside: avoid;
    }
    .signature-box {
      border-top: 1px solid #475569;
      padding-top: 4px;
      text-align: center;
      font-size: 7.5pt;
      color: #334155;
      line-height: 1.3;
    }
    .signature-box strong {
      color: #0a3641;
      font-size: 8pt;
    }

    /* Footer */
    .footer {
      margin-top: 15px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
    }

    /* Print Overrides */
    @media print {
      .screen-control-bar {
        display: none !important;
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff !important;
      }
      .document-page {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .session-card {
        border-color: #cbd5e1 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Top Bar (Hidden in Print) -->
  <div class="screen-control-bar">
    <div class="title">
      <span>🏛️ SUS Carangola · Programa Oficial do Simpósio</span>
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

  <div class="document-page">
    
    <!-- Official Header -->
    <div class="header">
      <div>
        <div class="header-logo-badge">
          SUS · Secretaria Municipal de Saúde de Carangola · Minas Gerais
        </div>
        <h1 class="header-title">${config.editionTitle} ${config.regionTitle}</h1>
        <div class="header-subtitle">Caderno Oficial da Programação e Grade Horária</div>
      </div>
      <div class="header-meta">
        <div><strong>Emissão:</strong> ${currentDate}</div>
        <div><strong>Território:</strong> Microrregião de Carangola</div>
        <div><strong>Realização:</strong> SMS & Colegiado RAPS</div>
        <div><strong>Validação:</strong> Documento Oficial</div>
      </div>
    </div>

    <!-- Logistics Meta Grid -->
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Data do Evento</div>
        <div class="meta-val">${config.eventFullDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Horário Oficial</div>
        <div class="meta-val">${config.eventHours} (8 Horas)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Local & Cidade</div>
        <div class="meta-val">${config.locationName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Endereço</div>
        <div class="meta-val">${config.locationAddress}</div>
      </div>
    </div>

    <!-- 3 Strategic Axes Summary Box -->
    <div class="axes-box">
      <div class="axes-title">
        <span>Eixos Temáticos Estratégicos</span>
        <span style="font-weight: normal; color: #ea7a38;">Diretrizes da RAPS e Reforma Psiquiátrica</span>
      </div>
      <div class="axes-list">
        ${axes.map(ax => `
          <div class="axes-item">
            <strong>Eixo ${ax.number}: ${ax.shortTitle || ax.title}</strong>
            ${ax.description.slice(0, 115)}...
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Schedule Heading -->
    <div class="schedule-heading">
      <span>Grade Minuciosa de Atividades</span>
      <span class="badge-info">Carga horária total: 8 horas com emissão de certificado oficial</span>
    </div>

    <!-- Sessions Loop -->
    ${sessions.map((session) => {
      const axisName = getAxisName(session.axisId);
      return `
        <div class="session-card">
          <div class="session-header">
            <div class="session-time">${session.timeStart} – ${session.timeEnd}</div>
            <div class="session-badges">
              ${getTypeBadge(session.type)}
              ${axisName ? `<span class="badge badge-navy">${axisName}</span>` : ''}
            </div>
          </div>

          <div class="session-body">
            <h2 class="session-title">${session.title}</h2>
            <div class="session-desc">${session.description}</div>
            <div class="session-loc">
              <strong>Local:</strong> ${session.location}
            </div>

            ${session.mediator ? `
              <div style="margin-top: 6px; padding: 5px 8px; background: #eef6f7; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 7.5pt; color: #0a3641;">
                <strong style="color: #028090; text-transform: uppercase;">Mediação:</strong>
                <strong> ${session.mediator.name}</strong> · ${session.mediator.role} (${session.mediator.institution})
              </div>
            ` : ''}

            ${session.speakers && session.speakers.length > 0 ? `
              <div class="speakers-container">
                <div class="speakers-heading">Palestrantes e Debatedores Convidados:</div>
                <div class="speakers-grid">
                  ${session.speakers.map(s => `
                    <div class="speaker-item">
                      <span class="speaker-name">${s.name}</span>
                      <span class="speaker-role"> · ${s.role}</span>
                      <div class="speaker-inst">${s.institution}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('')}

    <!-- Guidelines & Rules for Attendees -->
    <div class="rules-card">
      <div class="rules-title">Instruções para os Participantes e Certificação</div>
      <div class="rules-text">
        <strong>1. Credenciamento Presencial:</strong> O credenciamento inicia pontualmente às 07h30 com apresentação de documento oficial (ou crachá digital da plataforma).<br>
        <strong>2. Emissão de Certificados:</strong> O certificado oficial de 8 horas emitido pela Secretaria Municipal de Saúde de Carangola estará disponível após o término do evento para participantes com frequência validada.<br>
        <strong>3. Carta de Carangola:</strong> Ao término da plenária deliberativa, as deliberações serão consolidadas e encaminhadas às Câmaras Municipais e COSEMS-MG.
      </div>
    </div>

    <!-- Official Signatures Area -->
    <div class="signatures">
      <div class="signature-box">
        <strong>Superintendência de Saúde Mental</strong><br>
        Coordenação do Simpósio
      </div>
      <div class="signature-box">
        <strong>Supervisão Clínico Institucional da RAPS</strong><br>
        Coordenação do Simpósio
      </div>
      <div class="signature-box">
        <strong>Secretaria Municipal de Saúde de Carangola</strong><br>
        Coordenação do Simpósio
      </div>
    </div>

    <!-- Document Footer -->
    <div class="footer">
      <div>Sistema Único de Saúde (SUS) · Microrregião de Carangola - MG</div>
      <div>Documento gerado automaticamente pelo Portal Oficial do Simpósio</div>
    </div>

  </div>

  <script>
    // Automatically trigger print on load if opened in popup
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;
};

export const openSchedulePDFWindow = (
  sessions: ScheduleSession[],
  axes: ThematicAxis[],
  config: EventConfig = INITIAL_EVENT_CONFIG
): boolean => {
  try {
    const html = generateScheduleHTML(sessions, axes, config);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return false;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  } catch (err) {
    console.warn('Error opening printable schedule window:', err);
    return false;
  }
};
