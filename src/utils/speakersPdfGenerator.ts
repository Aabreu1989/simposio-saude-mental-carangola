import { EventConfig, SpeakerProfile } from '../types.ts';
import { INITIAL_EVENT_CONFIG, isRemovedSpeaker } from '../data/initialData.ts';
import { normalizeGoogleDriveImageUrl } from './helpers.ts';

const escapeHtml = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getInitials = (name: string): string => {
  const clean = name
    .replace(/^(Dra?\.ª?|Dr\.|Enf\.|Psic\.)\s+/i, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getSessionAccent = (group: SpeakerProfile['sessionGroup']): string => {
  switch (group) {
    case 'mesa-1':
      return '#028090';
    case 'mesa-2':
      return '#d96522';
    case 'mesa-3':
      return '#7c3aed';
    default:
      return '#0a3641';
  }
};

const getSessionGroupLabel = (group: SpeakerProfile['sessionGroup']): string => {
  switch (group) {
    case 'mesa-1':
      return 'Mesa 1 · RAPS';
    case 'mesa-2':
      return 'Mesa 2 · Urgência & Hospital';
    case 'mesa-3':
      return 'Mesa 3 · Justiça & Direitos';
    default:
      return 'Mesa de Abertura';
  }
};

export const exportSpeakersPdf = async (
  speakers: SpeakerProfile[],
  config: EventConfig = INITIAL_EVENT_CONFIG
): Promise<void> => {
  const validSpeakers = (speakers || []).filter((s) => !isRemovedSpeaker(s));
  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const styles = `
    * { box-sizing: border-box; }
    .spk-pdf-doc {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 18px 22px;
      width: 100%;
    }
    .spk-header {
      border-bottom: 3px solid #0a3641;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .spk-kicker {
      font-size: 8.5pt;
      font-weight: 800;
      color: #d96522;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .spk-title {
      font-size: 16pt;
      font-weight: 900;
      color: #0a3641;
      margin: 0;
      line-height: 1.18;
    }
    .spk-subtitle {
      font-size: 9pt;
      color: #475569;
      margin-top: 4px;
    }
    .spk-meta {
      text-align: right;
      font-size: 8pt;
      color: #475569;
      line-height: 1.45;
      border-left: 1px solid #cbd5e1;
      padding-left: 12px;
      white-space: nowrap;
    }
    .spk-list {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .spk-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 11px 13px;
      background: #faf8f5;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .spk-avatar {
      width: 58px;
      height: 58px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      border: 1.5px solid #cbd5e1;
      background: #0a3641;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14pt;
    }
    .spk-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }
    .spk-body {
      flex: 1;
      min-width: 0;
    }
    .spk-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .spk-name {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0a3641;
      margin: 0;
    }
    .spk-session {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .spk-role {
      font-size: 8.5pt;
      font-weight: 700;
      color: #d96522;
      margin-top: 2px;
    }
    .spk-bio {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.45;
      margin: 5px 0 6px 0;
    }
    .spk-socials {
      font-size: 7.8pt;
      color: #028090;
      font-weight: 600;
      border-top: 1px solid #e7e5e4;
      padding-top: 5px;
    }
    .spk-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748b;
    }
  `;

  const bodyHtml = `
    <div class="spk-pdf-doc">
      <div class="spk-header">
        <div>
          <div class="spk-kicker">SUS · Microrregião de Carangola / MG · Catálogo Oficial</div>
          <h1 class="spk-title">Palestrantes e Mediadores Convidados</h1>
          <div class="spk-subtitle">
            ${escapeHtml(config.editionTitle)} ${escapeHtml(config.regionTitle)} · ${escapeHtml(config.eventFullDate)} · ${escapeHtml(config.locationName)}
          </div>
        </div>
        <div class="spk-meta">
          <div><strong>Total:</strong> ${speakers.length} convidados</div>
          <div><strong>Horário:</strong> ${escapeHtml(config.eventHours)}</div>
          <div><strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</div>
        </div>
      </div>

      <div class="spk-list">
        ${validSpeakers
          .map((spk) => {
            const accent = getSessionAccent(spk.sessionGroup);
            const socialParts = [
              spk.socials.instagram ? `Instagram: ${escapeHtml(spk.socials.instagram)}` : '',
              spk.socials.linkedin ? `LinkedIn: ${escapeHtml(spk.socials.linkedin)}` : '',
              spk.socials.lattesUrl ? `Currículo Lattes: ${escapeHtml(spk.socials.lattesUrl)}` : ''
            ]
              .filter(Boolean)
              .join('  ·  ');

            return `
              <div class="spk-card">
                <div class="spk-avatar" style="background: ${accent};">
                  ${
                    spk.photoUrl
                      ? `<img src="${escapeHtml(normalizeGoogleDriveImageUrl(spk.photoUrl).url)}" alt="${escapeHtml(spk.name)}" style="object-position: ${escapeHtml(spk.photoPosition || 'center 18%')};" />`
                      : `<span>${escapeHtml(getInitials(spk.name))}</span>`
                  }
                </div>
                <div class="spk-body">
                  <div class="spk-top">
                    <h2 class="spk-name">${escapeHtml(spk.name)}</h2>
                    <span class="spk-session" style="color: ${accent}; font-weight: 700;">
                      ${escapeHtml(getSessionGroupLabel(spk.sessionGroup))} · ${escapeHtml(spk.sessionTime)} · ${escapeHtml(spk.sessionLabel)}
                    </span>
                  </div>
                  <div class="spk-role">
                    ${escapeHtml(spk.role)} · ${escapeHtml(spk.institution)}
                  </div>
                  <p class="spk-bio">${escapeHtml(spk.bio)}</p>
                  ${socialParts ? `<div class="spk-socials">${socialParts}</div>` : ''}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>

      <div class="spk-footer">
        <div>${escapeHtml(config.organizer)}</div>
        <div>Contato: ${escapeHtml(config.contactEmail)}</div>
      </div>
    </div>
  `;

  let hostEl: HTMLDivElement | null = null;
  try {
    hostEl = document.createElement('div');
    hostEl.style.position = 'fixed';
    hostEl.style.left = '-10000px';
    hostEl.style.top = '0';
    hostEl.style.width = '780px';
    hostEl.style.background = '#ffffff';
    hostEl.style.zIndex = '-1';
    hostEl.innerHTML = `<style>${styles}</style>${bodyHtml}`;
    document.body.appendChild(hostEl);

    const targetEl = hostEl.querySelector('.spk-pdf-doc') as HTMLElement | null;
    const html2pdfModule = await import('html2pdf.js');
    const html2pdfLib = (html2pdfModule as any)?.default || html2pdfModule;
    if (targetEl && typeof html2pdfLib === 'function') {
      await html2pdfLib()
        .set({
          margin: [10, 10, 12, 10],
          filename: 'palestrantes_simposio_carangola.pdf',
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(targetEl)
        .save();
      return;
    }
  } catch (err) {
    console.warn('html2pdf speakers fallback to hidden print iframe:', err);
  } finally {
    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
    }
  }

  // Fallback: Hidden iframe print (no window.open / window.alert)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Palestrantes - Simpósio de Saúde Mental</title><style>@page{size:A4 portrait;margin:12mm;}${styles}</style></head><body>${bodyHtml}</body></html>`
    );
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    }, 300);
  }
};
