import { EventConfig, SocialPost } from '../types.ts';
import { DEFAULT_EVENT_HASHTAGS, INITIAL_EVENT_CONFIG } from '../data/initialData.ts';

export type ShareFormat = 'feed' | 'story';

export interface ShareCardOptions {
  format: ShareFormat;
  post?: SocialPost;
  config?: EventConfig;
}

const DEFAULT_EVENT_IMAGE = '/assets/banner-oficial-simposio-saude-mental-carangola.jpg';
const SUS_LOGO_IMAGE = '/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg';

const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sWidth = img.width;
  let sHeight = img.height;

  if (imgRatio > targetRatio) {
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) / 2;
  } else {
    sHeight = img.width / targetRatio;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
};

const wrapTextLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] => {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    const remainingStart = words.slice(lines.join(' ').split(/\s+/).filter(Boolean).length).join(' ');
    let finalLine = remainingStart || currentLine;
    if (ctx.measureText(finalLine).width > maxWidth) {
      while (finalLine.length > 4 && ctx.measureText(`${finalLine}...`).width > maxWidth) {
        finalLine = finalLine.slice(0, -1);
      }
      finalLine = `${finalLine.trim()}...`;
    }
    lines.push(finalLine);
  }

  return lines;
};

export const buildShareCaption = (post?: SocialPost, config: EventConfig = INITIAL_EVENT_CONFIG): string => {
  const hashtags = (post?.hashtags || DEFAULT_EVENT_HASHTAGS).trim();
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (post) {
    return [
      `"${post.content}"`,
      `— ${post.authorName} (${post.authorRole} · ${post.city})`,
      '',
      `${config.editionTitle} ${config.regionTitle} (SUS/MG)`,
      `${config.eventFullDate} · ${config.locationName}`,
      '',
      hashtags,
      pageUrl
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `${config.editionTitle} ${config.regionTitle} (SUS/MG)`,
    `${config.eventFullDate}, das ${config.eventHours} · ${config.locationName}`,
    '',
    config.subtitle,
    '',
    hashtags,
    pageUrl
  ]
    .filter(Boolean)
    .join('\n');
};

export const generateSocialShareCardBlob = async ({
  format,
  post,
  config = INITIAL_EVENT_CONFIG
}: ShareCardOptions): Promise<Blob> => {
  const width = 1080;
  const height = format === 'story' ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D indisponível');
  }

  const eventBannerSrc = config.bannerImage || DEFAULT_EVENT_IMAGE;
  const [eventImg, postImg, logoImg] = await Promise.all([
    loadImage(eventBannerSrc),
    post?.imageUrl && post.imageUrl !== eventBannerSrc ? loadImage(post.imageUrl) : Promise.resolve(null),
    loadImage(SUS_LOGO_IMAGE)
  ]);

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#072a33');
  bgGrad.addColorStop(0.55, '#0a3641');
  bgGrad.addColorStop(1, '#026875');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative arcs
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ea7a38';
  ctx.beginPath();
  ctx.arc(width - 80, 120, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(110, height - 100, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const padX = 64;
  const cardWidth = width - padX * 2;
  const isStory = format === 'story';

  // 2. Top Header with SUS Logo + Event Title
  const headerY = isStory ? 92 : 48;
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(padX + 42, headerY + 42, 42, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    drawImageCover(ctx, logoImg, padX + 4, headerY + 4, 76, 76);
    ctx.restore();
  }

  const textLeft = logoImg ? padX + 104 : padX;
  ctx.fillStyle = '#f59e6c';
  ctx.font = '700 22px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText('SUS · MICRORREGIÃO DE CARANGOLA / MG', textLeft, headerY + 26);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px "Outfit", sans-serif';
  ctx.fillText(config.editionTitle, textLeft, headerY + 68);

  // Orange accent bar
  ctx.fillStyle = '#ea7a38';
  drawRoundedRect(ctx, padX, headerY + 104, 140, 6, 3);
  ctx.fill();

  // 3. Event Image Showcase Frame (Always present per requirement)
  const mediaY = isStory ? headerY + 145 : headerY + 130;
  const mediaH = isStory ? 620 : 370;

  ctx.save();
  drawRoundedRect(ctx, padX, mediaY, cardWidth, mediaH, 28);
  ctx.fillStyle = '#062129';
  ctx.fill();
  ctx.clip();

  const heroMedia = postImg || eventImg;
  if (heroMedia) {
    drawImageCover(ctx, heroMedia, padX, mediaY, cardWidth, mediaH);
  }

  // Bottom gradient overlay on hero photo for readability
  const imgOverlay = ctx.createLinearGradient(0, mediaY + mediaH - 170, 0, mediaY + mediaH);
  imgOverlay.addColorStop(0, 'rgba(6, 33, 41, 0)');
  imgOverlay.addColorStop(1, 'rgba(6, 33, 41, 0.88)');
  ctx.fillStyle = imgOverlay;
  ctx.fillRect(padX, mediaY + mediaH - 170, cardWidth, 170);

  // If user post had its own photo, embed official event image thumbnail cleanly in top-right badge frame
  if (postImg && eventImg) {
    const thumbSize = isStory ? 136 : 104;
    const thumbX = padX + cardWidth - thumbSize - 24;
    const thumbY = mediaY + 24;
    ctx.save();
    drawRoundedRect(ctx, thumbX - 4, thumbY - 4, thumbSize + 8, thumbSize + 8, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    drawRoundedRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 14);
    ctx.clip();
    drawImageCover(ctx, eventImg, thumbX, thumbY, thumbSize, thumbSize);
    ctx.restore();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${config.eventFullDate} · ${config.eventHours} · ${config.locationName}`,
    padX + 28,
    mediaY + mediaH - 28
  );
  ctx.restore();

  // Thin luminous border around image card
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, mediaY, cardWidth, mediaH, 28);
  ctx.stroke();

  // 4. Content White Card
  const contentY = mediaY + mediaH + (isStory ? 44 : 28);
  const contentH = isStory ? 840 : 410;

  ctx.save();
  drawRoundedRect(ctx, padX, contentY, cardWidth, contentH, 32);
  ctx.fillStyle = '#faf8f5';
  ctx.fill();
  ctx.restore();

  const innerPadX = padX + 46;
  const innerWidth = cardWidth - 92;
  let cursorY = contentY + (isStory ? 74 : 52);

  if (post) {
    ctx.fillStyle = '#d96522';
    ctx.font = '800 22px "JetBrains Mono", monospace, sans-serif';
    ctx.fillText('DESTAQUE DO MURAL DA COMUNIDADE', innerPadX, cursorY);
    cursorY += isStory ? 54 : 42;

    ctx.fillStyle = '#0a3641';
    ctx.font = isStory ? '600 40px "Plus Jakarta Sans", sans-serif' : '600 28px "Plus Jakarta Sans", sans-serif';
    const quoteLines = wrapTextLines(ctx, `"${post.content}"`, innerWidth, isStory ? 8 : 5);
    const lineHeight = isStory ? 54 : 38;
    for (const line of quoteLines) {
      ctx.fillText(line, innerPadX, cursorY);
      cursorY += lineHeight;
    }

    cursorY += isStory ? 28 : 16;
    ctx.fillStyle = '#0a3641';
    ctx.font = '800 26px "Outfit", sans-serif';
    ctx.fillText(post.authorName, innerPadX, cursorY);
    cursorY += 32;

    ctx.fillStyle = '#57534e';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${post.authorRole} · ${post.city}`, innerPadX, cursorY);
  } else {
    ctx.fillStyle = '#d96522';
    ctx.font = '800 22px "JetBrains Mono", monospace, sans-serif';
    ctx.fillText('CONVITE OFICIAL · INSCRIÇÕES GRATUITAS', innerPadX, cursorY);
    cursorY += isStory ? 58 : 44;

    ctx.fillStyle = '#0a3641';
    ctx.font = isStory ? '800 48px "Outfit", sans-serif' : '800 34px "Outfit", sans-serif';
    const titleLines = wrapTextLines(
      ctx,
      `${config.editionTitle} ${config.regionTitle}`,
      innerWidth,
      2
    );
    for (const line of titleLines) {
      ctx.fillText(line, innerPadX, cursorY);
      cursorY += isStory ? 58 : 42;
    }

    cursorY += 12;
    ctx.fillStyle = '#44403c';
    ctx.font = isStory ? '500 32px "Plus Jakarta Sans", sans-serif' : '500 23px "Plus Jakarta Sans", sans-serif';
    const subLines = wrapTextLines(ctx, config.subtitle, innerWidth, isStory ? 5 : 3);
    for (const line of subLines) {
      ctx.fillText(line, innerPadX, cursorY);
      cursorY += isStory ? 44 : 32;
    }
  }

  // 5. Mandatory Event Hashtags Strip inside the White Card Footer
  const hashtagsText = (post?.hashtags || DEFAULT_EVENT_HASHTAGS).trim();
  const hashBarH = isStory ? 130 : 88;
  const hashBarY = contentY + contentH - hashBarH - 28;

  ctx.save();
  drawRoundedRect(ctx, innerPadX - 10, hashBarY, innerWidth + 20, hashBarH, 18);
  ctx.fillStyle = '#eef6f7';
  ctx.fill();
  ctx.strokeStyle = '#cce4e7';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#028090';
  ctx.font = isStory ? '700 24px "JetBrains Mono", monospace, sans-serif' : '700 19px "JetBrains Mono", monospace, sans-serif';
  const hashLines = wrapTextLines(ctx, hashtagsText, innerWidth - 20, 2);
  let hashY = hashBarY + (isStory ? 50 : 38);
  for (const hLine of hashLines) {
    ctx.fillText(hLine, innerPadX + 8, hashY);
    hashY += isStory ? 38 : 28;
  }

  // 6. Bottom Footer CTA (especially helpful for Stories)
  const footerY = height - (isStory ? 84 : 40);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    isStory
      ? 'Toque para compartilhar nos Stories · RAPS Microrregião de Carangola'
      : 'Portal Oficial SUS · RAPS Microrregião de Carangola',
    padX,
    footerY
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao exportar imagem PNG'));
        }
      },
      'image/png',
      0.95
    );
  });
};

export const downloadBlobAsPng = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const canShareFilesNatively = (file?: File): boolean => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  if (!file) return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
};

export const shareWithNativeFiles = async (
  blob: Blob,
  filename: string,
  title: string,
  text: string,
  url: string
): Promise<'shared' | 'cancelled' | 'unsupported'> => {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return 'unsupported';
  }
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text,
        files: [file]
      });
      return 'shared';
    }
    await navigator.share({ title, text, url });
    return 'shared';
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
};

export const copyImageBlobToClipboard = async (blob: Blob): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
    return true;
  } catch {
    return false;
  }
};
