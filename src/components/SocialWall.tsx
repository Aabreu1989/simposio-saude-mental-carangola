import React, { useEffect, useMemo, useState } from 'react';
import {
  Share2,
  Heart,
  Camera,
  Check,
  Copy,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  Hash,
  Smartphone,
  LayoutGrid,
  X,
  Loader2,
  Send,
  Clock
} from 'lucide-react';
import { EventConfig, SocialPost } from '../types.ts';
import { DEFAULT_EVENT_HASHTAGS, INITIAL_EVENT_CONFIG } from '../data/initialData.ts';
import {
  ShareFormat,
  buildShareCaption,
  copyImageBlobToClipboard,
  downloadBlobAsPng,
  generateSocialShareCardBlob,
  shareWithNativeFiles
} from '../utils/socialShareHelper.ts';

const FacebookIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

interface SocialWallProps {
  posts: SocialPost[];
  onAddPost: (post: SocialPost) => void;
  onLikePost: (postId: string) => void;
  config?: EventConfig;
}

const POSTS_PER_PAGE = 8;

export const formatPostDateTime = (post: SocialPost): string => {
  let date: Date | null = null;
  if (post.timestamp && !isNaN(Number(post.timestamp))) {
    date = new Date(Number(post.timestamp));
  } else if (post.createdAt && !isNaN(Date.parse(post.createdAt))) {
    date = new Date(post.createdAt);
  }
  if (date && !isNaN(date.getTime())) {
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} às ${timeStr}`;
  }
  return post.createdAt || '';
};

const mergeRequiredHashtags = (input: string): string => {
  const requiredTags = DEFAULT_EVENT_HASHTAGS.split(/\s+/).filter(Boolean);
  const customTokens = input
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));

  const seen = new Set<string>();
  const combined: string[] = [];

  for (const tag of [...requiredTags, ...customTokens]) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(tag);
    }
  }
  return combined.join(' ');
};

export const SocialWall: React.FC<SocialWallProps> = ({
  posts,
  onAddPost,
  onLikePost,
  config = INITIAL_EVENT_CONFIG
}) => {
  const [isPosting, setIsPosting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // New post form state
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [city, setCity] = useState('Carangola');
  const [content, setContent] = useState('');
  const [hashtagsField, setHashtagsField] = useState(DEFAULT_EVENT_HASHTAGS);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Share Studio Modal state
  const [shareStudioOpen, setShareStudioOpen] = useState(false);
  const [shareTargetPost, setShareTargetPost] = useState<SocialPost | undefined>(undefined);
  const [shareFormat, setShareFormat] = useState<ShareFormat>('feed');
  const [sharePlatformHint, setSharePlatformHint] = useState<'instagram' | 'stories' | 'facebook'>('instagram');
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Sort strictly newest-first by timestamp
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [posts]);

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / POSTS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return sortedPosts.slice(start, start + POSTS_PER_PAGE);
  }, [sortedPosts, currentPage]);

  // Rebuild Canvas share card whenever Share Studio opens or format/post changes
  useEffect(() => {
    if (!shareStudioOpen) return;
    let active = true;
    let localUrl: string | null = null;

    setIsGeneratingCard(true);
    setShareFeedback(null);

    generateSocialShareCardBlob({
      format: shareFormat,
      post: shareTargetPost,
      config
    })
      .then((blob) => {
        if (!active) return;
        localUrl = URL.createObjectURL(blob);
        setGeneratedBlob(blob);
        setGeneratedPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return localUrl;
        });
      })
      .catch(() => {
        if (active) {
          setShareFeedback('Não foi possível gerar a prévia gráfica neste navegador.');
        }
      })
      .finally(() => {
        if (active) setIsGeneratingCard(false);
      });

    return () => {
      active = false;
    };
  }, [shareStudioOpen, shareFormat, shareTargetPost, config]);

  const openShareStudio = (
    platform: 'instagram' | 'stories' | 'facebook',
    post?: SocialPost
  ) => {
    setShareTargetPost(post);
    setSharePlatformHint(platform);
    setShareFormat(platform === 'stories' ? 'story' : 'feed');
    setShareFeedback(null);
    setShareStudioOpen(true);
  };

  const closeShareStudio = () => {
    setShareStudioOpen(false);
    if (generatedPreviewUrl) {
      URL.revokeObjectURL(generatedPreviewUrl);
      setGeneratedPreviewUrl(null);
    }
    setGeneratedBlob(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;

    const finalHashtags = mergeRequiredHashtags(hashtagsField);

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      authorName: authorName.trim(),
      authorRole: authorRole.trim() || 'Participante do Simpósio',
      city: city.trim() || 'Carangola',
      content: content.trim(),
      hashtags: finalHashtags,
      imageUrl: imagePreview || undefined,
      likes: 1,
      hasLiked: true,
      createdAt: `${dateStr} às ${timeStr}`,
      timestamp: Date.now()
    };

    onAddPost(newPost);
    setCurrentPage(1);

    setAuthorName('');
    setAuthorRole('');
    setContent('');
    setHashtagsField(DEFAULT_EVENT_HASHTAGS);
    setImagePreview(null);
    setIsPosting(false);
  };

  const activeCaption = useMemo(
    () => buildShareCaption(shareTargetPost, config),
    [shareTargetPost, config]
  );

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const facebookQuote = shareTargetPost
    ? `"${shareTargetPost.content}" — ${shareTargetPost.authorName} (${shareTargetPost.city})\n\n${shareTargetPost.hashtags || DEFAULT_EVENT_HASHTAGS}`
    : `${config.editionTitle} ${config.regionTitle} (SUS/MG)\n\n${DEFAULT_EVENT_HASHTAGS}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(facebookQuote)}`;
  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(activeCaption)}`;

  const handleNativeShare = async () => {
    if (!generatedBlob) return;
    const filename =
      shareFormat === 'story'
        ? 'simposio-carangola-story-9x16.png'
        : 'simposio-carangola-card-feed.png';
    const result = await shareWithNativeFiles(
      generatedBlob,
      filename,
      `${config.editionTitle} ${config.regionTitle}`,
      activeCaption,
      pageUrl
    );
    if (result === 'shared') {
      setShareFeedback('Conteúdo enviado para o compartilhamento do seu dispositivo!');
    } else if (result === 'unsupported') {
      await handleCopyCaption();
      setShareFeedback('Compartilhamento nativo indisponível aqui. Legenda copiada — baixe a imagem abaixo para postar.');
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(activeCaption);
      setShareFeedback('Texto com imagem e hashtags oficiais copiado para a área de transferência.');
    } catch {
      setShareFeedback('Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.');
    }
  };

  const handleCopyImage = async () => {
    if (!generatedBlob) return;
    const copied = await copyImageBlobToClipboard(generatedBlob);
    if (copied) {
      setShareFeedback('Arte oficial copiada como imagem! Cole diretamente no Facebook ou Instagram.');
    } else {
      downloadBlobAsPng(
        generatedBlob,
        shareFormat === 'story' ? 'simposio-carangola-story.png' : 'simposio-carangola-feed.png'
      );
      setShareFeedback('Seu navegador salvou a arte em PNG diretamente nos Downloads.');
    }
  };

  const handleDownloadCard = () => {
    if (!generatedBlob) return;
    const filename =
      shareFormat === 'story'
        ? 'simposio-saude-mental-instagram-story-9x16.png'
        : 'simposio-saude-mental-card-feed-1x1.png';
    downloadBlobAsPng(generatedBlob, filename);
    setShareFeedback(
      shareFormat === 'story'
        ? 'Card vertical 9:16 baixado! Abra o Instagram Stories e selecione a imagem salva.'
        : 'Card quadrado 1:1 baixado com a foto do evento e hashtags oficiais.'
    );
  };

  return (
    <section id="mural" className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-bold text-[#d96522] uppercase tracking-wider mb-2 font-mono">
              Participação & Comunidade
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a3641] tracking-tight">
              Mural de Destaques em Tempo Real
            </h2>
            <p className="mt-2 text-stone-600 text-sm max-w-2xl">
              Acompanhe as reflexões, fotos dos bastidores e relatos dos profissionais e lideranças da microrregião, ordenados dos mais recentes para os anteriores.
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full lg:w-auto">
            {/* Primary Dominant CTA */}
            <button
              type="button"
              onClick={() => {
                setHashtagsField(DEFAULT_EVENT_HASHTAGS);
                setIsPosting(true);
              }}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] hover:brightness-105 active:scale-95 rounded-2xl shadow-lg shadow-[#ea7a38]/30 ring-3 ring-[#ea7a38]/35 transition-all duration-200 cursor-pointer uppercase tracking-wider whitespace-nowrap"
              aria-label="Publicar foto ou relato no mural da comunidade"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0 group-hover:scale-110 transition-transform" />
              <span>Publicar Foto ou Publicação</span>
            </button>

            {/* Subdued Secondary Share Row (deliberately lower visual weight) */}
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-1.5 text-[11px] text-stone-500">
              <span className="font-medium mr-1">Compartilhar mural:</span>
              <button
                type="button"
                onClick={() => openShareStudio('instagram')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:text-[#c13584] bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200/80 transition-colors cursor-pointer whitespace-nowrap"
              >
                <InstagramIcon className="w-3 h-3 text-stone-500" />
                <span>Instagram Feed</span>
              </button>
              <button
                type="button"
                onClick={() => openShareStudio('stories')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:text-[#c13584] bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200/80 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Smartphone className="w-3 h-3 text-stone-500" />
                <span>Stories 9:16</span>
              </button>
              <button
                type="button"
                onClick={() => openShareStudio('facebook')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:text-[#1877f2] bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200/80 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FacebookIcon className="w-3 h-3 text-stone-500" />
                <span>Facebook</span>
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:text-emerald-700 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200/80 transition-colors whitespace-nowrap"
              >
                <Share2 className="w-3 h-3 text-stone-500" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal: Create New Post (with pre-filled Event Hashtags) */}
        {isPosting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="text-base font-bold text-[#0a3641] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#d96522]" />
                  <span>Nova Publicação no Mural</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPosting(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
                  aria-label="Fechar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitPost} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Seu Nome *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Mariana Vasconcelos"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Cargo / Função</label>
                    <input
                      type="text"
                      placeholder="Ex: Psicóloga do CAPS"
                      value={authorRole}
                      onChange={(e) => setAuthorRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Município</label>
                    <input
                      type="text"
                      placeholder="Ex: Carangola, Divino..."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Seu Relato ou Mensagem *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Compartilhe seus aprendizados, impressões ou mensagem sobre o cuidado em liberdade..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  />
                </div>

                {/* Mandatory Pre-filled Event Hashtags Field */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-[#0a3641] mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-[#028090]" />
                      Hashtags do Evento (incluídas automaticamente)
                    </span>
                    <button
                      type="button"
                      onClick={() => setHashtagsField(DEFAULT_EVENT_HASHTAGS)}
                      className="text-[11px] font-semibold text-[#028090] hover:underline cursor-pointer"
                    >
                      Restaurar padrão
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={hashtagsField}
                    onChange={(e) => setHashtagsField(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono text-[#028090] bg-[#eef6f7] border border-[#cce4e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028090]"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    As hashtags oficiais do simpósio acompanham obrigatoriamente todas as publicações e compartilhamentos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Anexar Foto (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0a3641] file:text-white hover:file:bg-[#0f4b59] cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 p-1.5 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Prévia da imagem"
                        className="max-h-32 sm:max-h-36 w-auto max-w-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1 text-xs cursor-pointer"
                        aria-label="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsPosting(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#028090] rounded-lg cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publicar Agora</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Interactive Social Share Studio (Canvas Card + Event Image + Stories 9:16 + Facebook + Web Share) */}
        {shareStudioOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeShareStudio();
            }}
          >
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="px-5 py-4 bg-[#0a3641] text-white flex items-center justify-between border-b-2 border-[#ea7a38] shrink-0">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#ea7a38]" />
                    <span>Estúdio de Compartilhamento com Imagem do Evento</span>
                  </h3>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    Arte gerada com a foto oficial do simpósio, texto e hashtags obrigatórias para Instagram Feed, Stories e Facebook.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeShareStudio}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                  aria-label="Fechar estúdio de compartilhamento"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left: Format Selector & Card Preview */}
                <div className="md:col-span-6 flex flex-col items-center gap-3">
                  <div className="w-full grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setShareFormat('feed')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shareFormat === 'feed'
                          ? 'bg-white text-[#0a3641] shadow-xs'
                          : 'text-stone-600 hover:text-[#0a3641]'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-[#1877f2]" />
                      <span>Feed / Facebook (1:1)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareFormat('story')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shareFormat === 'story'
                          ? 'bg-white text-[#0a3641] shadow-xs'
                          : 'text-stone-600 hover:text-[#0a3641]'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#c13584]" />
                      <span>Instagram Stories (9:16)</span>
                    </button>
                  </div>

                  <div className="w-full bg-stone-100 border border-stone-200 rounded-2xl p-3 flex items-center justify-center min-h-[280px]">
                    {isGeneratingCard ? (
                      <div className="flex flex-col items-center gap-2 text-stone-500 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin text-[#028090]" />
                        <span>Renderizando arte com foto oficial e hashtags...</span>
                      </div>
                    ) : generatedPreviewUrl ? (
                      <img
                        src={generatedPreviewUrl}
                        alt="Prévia do card para compartilhamento"
                        className={`rounded-xl shadow-md border border-stone-200 object-contain ${
                          shareFormat === 'story' ? 'max-h-[340px] w-auto' : 'max-h-[300px] w-full'
                        }`}
                      />
                    ) : (
                      <span className="text-xs text-stone-500">Prévia indisponível</span>
                    )}
                  </div>
                </div>

                {/* Right: Direct Platform Actions & Caption */}
                <div className="md:col-span-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-[#0a3641] mb-1.5">
                        1. Compartilhamento Direto e Inteligente
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={handleNativeShare}
                          disabled={!generatedBlob || isGeneratingCard}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#0a3641] hover:bg-[#028090] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Share2 className="w-4 h-4 text-[#ea7a38]" />
                          <span>Enviar Imagem + Texto pelo Dispositivo (Web Share)</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={sharePlatformHint === 'stories' || shareFormat === 'story' ? 'instagram-stories://share' : 'https://www.instagram.com/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              handleCopyCaption();
                            }}
                            className="py-2.5 px-3 rounded-xl border border-pink-200 bg-pink-50/70 hover:bg-pink-100 text-[#c13584] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <InstagramIcon className="w-3.5 h-3.5" />
                            <span>
                              {shareFormat === 'story' ? 'Abrir IG Stories' : 'Abrir Instagram'}
                            </span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>

                          <a
                            href={facebookHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#1877f2] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FacebookIcon className="w-3.5 h-3.5" />
                            <span>Publicar no Facebook</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-[#0a3641] mb-1.5">
                        2. Baixar ou Copiar Arte Oficial
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadCard}
                          disabled={!generatedBlob || isGeneratingCard}
                          className="py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5 text-[#028090]" />
                          <span>{shareFormat === 'story' ? 'Baixar Story 9:16' : 'Baixar Card PNG'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyImage}
                          disabled={!generatedBlob || isGeneratingCard}
                          className="py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#d96522]" />
                          <span>Copiar Imagem</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#0a3641]">
                          3. Legenda + Hashtags do Evento
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCaption}
                          className="text-[11px] font-bold text-[#028090] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar legenda</span>
                        </button>
                      </div>
                      <textarea
                        readOnly
                        rows={4}
                        value={activeCaption}
                        className="w-full p-2.5 text-[11px] font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {shareFeedback && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{shareFeedback}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paginated Newest-First Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paginatedPosts.map((post) => {
            const postHashtags = (post.hashtags && post.hashtags.trim()) || DEFAULT_EVENT_HASHTAGS;
            return (
              <article
                key={post.id}
                className="rounded-2xl p-5 border border-stone-200 bg-[#faf8f5] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all"
              >
                <div>
                  {/* Author Header */}
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-[#0a3641] leading-tight">
                      {post.authorName}
                    </h3>
                    <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                      {post.authorRole} · <span className="text-[#d96522]">{post.city}</span>
                    </div>
                  </div>

                  {/* Optional Post Image */}
                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden mb-3 border border-stone-200/90 bg-stone-100 flex items-center justify-center p-1.5">
                      <img
                        src={post.imageUrl}
                        alt={`Foto publicada por ${post.authorName}`}
                        referrerPolicy="no-referrer"
                        className="max-h-32 sm:max-h-36 w-auto max-w-full object-contain rounded-lg hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* User Text Content */}
                  <p className="text-xs text-stone-700 leading-relaxed mb-3 break-words">
                    "{post.content}"
                  </p>

                  {/* Mandatory Event Hashtags */}
                  <p className="text-[11px] font-mono font-semibold text-[#028090] leading-snug mb-4 break-words">
                    {postHashtags}
                  </p>
                </div>

                {/* Footer: Timestamp (Data e Hora), Subdued Share Actions, Like */}
                <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-[11px] font-medium text-stone-500 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#ea7a38] shrink-0" />
                    <span>{formatPostDateTime(post)}</span>
                  </span>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openShareStudio('instagram', post)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#c13584] hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Compartilhar no Instagram ou Stories (9:16)"
                      aria-label="Compartilhar publicação no Instagram ou Stories"
                    >
                      <InstagramIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openShareStudio('stories', post)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#c13584] hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Gerar Card Instagram Stories (9:16)"
                      aria-label="Gerar Card para Instagram Stories"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openShareStudio('facebook', post)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#1877f2] hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Compartilhar no Facebook com imagem do evento"
                      aria-label="Compartilhar publicação no Facebook"
                    >
                      <FacebookIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onLikePost(post.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ml-1 ${
                        post.hasLiked
                          ? 'text-rose-600 font-bold bg-rose-50'
                          : 'hover:text-rose-600 hover:bg-stone-100'
                      }`}
                      title="Curtir publicação"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`}
                      />
                      <span className="text-[11px] font-semibold">{post.likes}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav
            aria-label="Paginação do mural de publicações"
            className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200/80"
          >
            <div className="text-xs text-stone-500 font-medium">
              Página <strong className="text-[#0a3641]">{currentPage}</strong> de{' '}
              <strong className="text-[#0a3641]">{totalPages}</strong> · {sortedPosts.length} publicações (mais recentes primeiro)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0a3641] text-white shadow-2xs'
                        : 'text-stone-600 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </nav>
        )}

        {/* Official Hashtags Footer Strip */}
        <div className="mt-6 p-3.5 sm:p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-2">
            <Hash className="w-4 h-4 text-[#d96522] shrink-0" />
            <span className="font-semibold text-stone-800">Hashtags Oficiais do Evento:</span>
            <span className="font-mono text-[#0a3641] break-words">{DEFAULT_EVENT_HASHTAGS}</span>
          </div>
          <span className="text-[11px] text-stone-500">
            Todas as publicações e cards levam automaticamente as hashtags e a imagem oficial do simpósio.
          </span>
        </div>
      </div>
    </section>
  );
};
