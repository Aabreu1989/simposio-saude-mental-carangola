import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  Briefcase,
  Building2,
  PieChart as PieChartIcon,
  BarChart2,
  TrendingUp,
  Layers,
  Sparkles,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { Registration, SocialPost } from '../types.ts';
import { PROFESSIONAL_ROLES, SUS_CARE_LEVELS } from '../data/initialData.ts';

interface RechartsVisualDashboardProps {
  registrations: Registration[];
  socialPosts?: SocialPost[];
  maxSpots: number;
}

// Harmonious SUS Healthcare Palette
const ROLE_COLORS = [
  '#0a3641', // Deep Teal
  '#028090', // Vibrant Cyan
  '#2a9d8f', // Forest Emerald
  '#ea7a38', // Warm Amber Orange
  '#d96522', // Rust Red
  '#e76f51', // Coral Terra Cotta
  '#3a86ff', // Bright Blue
  '#8338ec', // Deep Violet
  '#ff006e', // Magenta
  '#fb5607', // Vivid Orange
  '#457b9d', // Slate Cyan
  '#1d3557', // Midnight Navy
  '#10b981', // Pure Emerald
  '#f59e0b', // Goldenrod
  '#64748b'  // Cool Gray
];

const SUS_LEVEL_COLORS: Record<string, string> = {
  'Atenção Primária': '#028090',
  'Atenção Psicossocial': '#ea7a38',
  'Atenção Farmacêutica': '#10b981',
  'Atenção Hospitalar': '#3b82f6',
  'Gestão Municipal': '#8b5cf6',
  'Assistência Social': '#f59e0b',
  'Sistema de Justiça': '#ec4899',
  'Academia': '#06b6d4',
  'Usuário': '#14b8a6',
  'Outro': '#64748b'
};

const getSusLevelColor = (levelName: string, index: number) => {
  for (const [key, color] of Object.entries(SUS_LEVEL_COLORS)) {
    if (levelName.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return ROLE_COLORS[index % ROLE_COLORS.length];
};

export const RechartsVisualDashboard: React.FC<RechartsVisualDashboardProps> = ({
  registrations,
  socialPosts = [],
  maxSpots
}) => {
  const [roleChartType, setRoleChartType] = useState<'bar' | 'pie' | 'column'>('bar');
  const [roleViewLimit, setRoleViewLimit] = useState<'top8' | 'all'>('top8');
  const [susChartType, setSusChartType] = useState<'bar' | 'pie'>('bar');
  const [timelineChartType, setTimelineChartType] = useState<'area' | 'bar'>('area');
  const [postsDimension, setPostsDimension] = useState<'city' | 'role' | 'media'>('city');
  const [isCompactScreen, setIsCompactScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 520 : false
  );

  useEffect(() => {
    const onResize = () => {
      setIsCompactScreen(window.innerWidth < 520);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalRegistrations = registrations.length;
  const totalPosts = socialPosts.length;
  const totalPostLikes = socialPosts.reduce((acc, p) => acc + (p.likes || 0), 0);

  // 1. Process data for Professional Roles
  const roleData = useMemo(() => {
    const counts: Record<string, number> = {};

    registrations.forEach((r) => {
      const role = r.professionalRole?.trim() || 'Não Informado';
      counts[role] = (counts[role] || 0) + 1;
    });

    PROFESSIONAL_ROLES.forEach((r) => {
      if (!counts[r]) counts[r] = 0;
    });

    const entries = Object.entries(counts).map(([name, count]) => {
      const percentage = totalRegistrations > 0 ? (count / totalRegistrations) * 100 : 0;
      const capacityShare = maxSpots > 0 ? (count / maxSpots) * 100 : 0;
      let shortName = name;
      if (name.includes('Médico(a) de Família')) shortName = 'Médico(a) Família';
      else if (name.includes('Usuário(a) do SUS')) shortName = 'Usuário(a) SUS';
      else if (name.includes('Profissional da Assistência')) shortName = 'CRAS / CREAS';
      else if (name.includes('Profissional do Judiciário')) shortName = 'Judiciário / MP';
      else if (name.includes('Fonoaudiólogo(a)')) shortName = 'Fono / Fisio';
      else if (name.includes('Agente Comunitário')) shortName = 'ACS / ACE';
      else if (name.includes('Técnico(a) de Enfermagem')) shortName = 'Téc. Enfermagem';

      return {
        name,
        shortName,
        count,
        percentage: Number(percentage.toFixed(1)),
        capacityShare: Number(capacityShare.toFixed(1))
      };
    });

    entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return entries;
  }, [registrations, totalRegistrations, maxSpots]);

  const displayedRoleData = useMemo(() => {
    if (roleViewLimit === 'top8') {
      const top = roleData.slice(0, 8);
      const remainingCount = roleData.slice(8).reduce((acc, curr) => acc + curr.count, 0);
      if (remainingCount > 0 && roleChartType === 'pie') {
        const remainingPercentage = totalRegistrations > 0 ? (remainingCount / totalRegistrations) * 100 : 0;
        return [
          ...top,
          {
            name: 'Outras Ocupações Somadas',
            shortName: 'Outras Ocupações',
            count: remainingCount,
            percentage: Number(remainingPercentage.toFixed(1)),
            capacityShare: Number(((remainingCount / maxSpots) * 100).toFixed(1))
          }
        ];
      }
      return top;
    }
    return roleData.filter((r) => r.count > 0 || PROFESSIONAL_ROLES.includes(r.name));
  }, [roleData, roleViewLimit, roleChartType, totalRegistrations, maxSpots]);

  // 2. Process data for SUS Care Levels
  const susLevelData = useMemo(() => {
    const counts: Record<string, number> = {};

    registrations.forEach((r) => {
      const lvl = r.susCareLevel?.trim() || 'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)';
      counts[lvl] = (counts[lvl] || 0) + 1;
    });

    SUS_CARE_LEVELS.forEach((lvl) => {
      if (!counts[lvl]) counts[lvl] = 0;
    });

    const entries = Object.entries(counts).map(([fullName, count]) => {
      const percentage = totalRegistrations > 0 ? (count / totalRegistrations) * 100 : 0;
      let shortName = fullName.split('/')[0].trim();
      if (fullName.includes('Atenção Farmacêutica')) shortName = 'Farmacêutica';
      else if (fullName.includes('Atenção Primária')) shortName = 'Atenção Primária';
      else if (fullName.includes('Atenção Psicossocial')) shortName = 'CAPS / Psicossocial';
      else if (fullName.includes('Atenção Hospitalar')) shortName = 'Hospital / Urgência';
      else if (fullName.includes('Gestão Municipal')) shortName = 'Gestão / Regulação';
      else if (fullName.includes('Assistência Social')) shortName = 'CRAS / CREAS';
      else if (fullName.includes('Sistema de Justiça')) shortName = 'Justiça / MP';
      else if (fullName.includes('Academia')) shortName = 'Academia / Univ.';
      else if (fullName.includes('Usuário')) shortName = 'Usuário / Social';

      return {
        fullName,
        shortName,
        count,
        percentage: Number(percentage.toFixed(1))
      };
    });

    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [registrations, totalRegistrations]);

  // 3. Process Daily Registration Evolution (registeredAt)
  const timelineData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    registrations.forEach((r) => {
      const raw = r.registeredAt || '';
      const isoDay = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
      const validDay = /^\d{4}-\d{2}-\d{2}$/.test(isoDay) ? isoDay : new Date().toISOString().split('T')[0];
      dayCounts[validDay] = (dayCounts[validDay] || 0) + 1;
    });

    const sortedDays = Object.keys(dayCounts).sort();
    let cumulative = 0;
    return sortedDays.map((day) => {
      const count = dayCounts[day];
      cumulative += count;
      const [, m, d] = day.split('-');
      return {
        isoDate: day,
        label: `${d}/${m}`,
        count,
        cumulative
      };
    });
  }, [registrations]);

  // 4. Process Social Posts Analytics for Recharts
  const postsChartData = useMemo(() => {
    if (postsDimension === 'city') {
      const map: Record<string, number> = {};
      socialPosts.forEach((p) => {
        const key = p.city || 'Carangola';
        map[key] = (map[key] || 0) + 1;
      });
      return Object.entries(map)
        .map(([name, count]) => ({
          name,
          shortName: name.length > 16 ? name.slice(0, 15) + '…' : name,
          count,
          percentage: totalPosts > 0 ? Number(((count / totalPosts) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.count - a.count);
    }

    if (postsDimension === 'role') {
      const map: Record<string, number> = {};
      socialPosts.forEach((p) => {
        const key = p.authorRole || 'Participante';
        map[key] = (map[key] || 0) + 1;
      });
      return Object.entries(map)
        .map(([name, count]) => ({
          name,
          shortName: name.length > 18 ? name.slice(0, 17) + '…' : name,
          count,
          percentage: totalPosts > 0 ? Number(((count / totalPosts) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }

    // media (Foto vs Texto)
    const withPhoto = socialPosts.filter((p) => !!p.imageUrl).length;
    const textOnly = Math.max(0, totalPosts - withPhoto);
    return [
      {
        name: 'Com Foto Anexada',
        shortName: 'Com Foto',
        count: withPhoto,
        percentage: totalPosts > 0 ? Number(((withPhoto / totalPosts) * 100).toFixed(1)) : 0
      },
      {
        name: 'Texto Puro / Reflexão',
        shortName: 'Texto Puro',
        count: textOnly,
        percentage: totalPosts > 0 ? Number(((textOnly / totalPosts) * 100).toFixed(1)) : 0
      }
    ];
  }, [socialPosts, postsDimension, totalPosts]);

  // Executive Insights Calculations
  const insights = useMemo(() => {
    const primaryCare = susLevelData.find((s) => s.fullName.toLowerCase().includes('primária'))?.count || 0;
    const capsCare = susLevelData.find((s) => s.fullName.toLowerCase().includes('psicossocial') || s.fullName.includes('CAPS'))?.count || 0;
    const pharmaCare = susLevelData.find((s) => s.fullName.toLowerCase().includes('farmac'))?.count || 0;
    const coreRaps = primaryCare + capsCare + pharmaCare;
    const coreRapsPct = totalRegistrations > 0 ? Math.round((coreRaps / totalRegistrations) * 100) : 0;

    const topRole = roleData[0] || { name: 'Nenhuma', count: 0, percentage: 0 };

    return {
      coreRaps,
      coreRapsPct,
      topRole,
      activeRolesCount: roleData.filter((r) => r.count > 0).length,
      activeLevelsCount: susLevelData.filter((s) => s.count > 0).length
    };
  }, [susLevelData, roleData, totalRegistrations]);

  // Custom Tooltip for Roles
  const CustomRoleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0a3641] text-white p-3 rounded-xl shadow-xl border border-teal-500/30 text-xs max-w-xs space-y-1.5 z-50">
          <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{data.name}</span>
          </div>
          <div className="flex items-center justify-between text-stone-200 pt-1 border-t border-teal-700/50">
            <span>Inscritos:</span>
            <span className="font-mono font-bold text-white text-sm">{data.count} participantes</span>
          </div>
          <div className="flex items-center justify-between text-stone-200">
            <span>Proporção dos Inscritos:</span>
            <span className="font-mono font-semibold text-amber-300">{data.percentage}%</span>
          </div>
          <div className="flex items-center justify-between text-stone-200">
            <span>Ocupação do Auditório:</span>
            <span className="font-mono text-teal-200">{data.capacityShare}% das vagas</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for SUS Care Levels
  const CustomSusTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0a3641] text-white p-3 rounded-xl shadow-xl border border-teal-500/30 text-xs max-w-xs space-y-1.5 z-50">
          <div className="font-bold text-sm text-teal-200 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{data.fullName}</span>
          </div>
          <div className="flex items-center justify-between text-stone-200 pt-1 border-t border-teal-700/50">
            <span>Profissionais Vinculados:</span>
            <span className="font-mono font-bold text-white text-sm">{data.count} participantes</span>
          </div>
          <div className="flex items-center justify-between text-stone-200">
            <span>Representatividade no Simpósio:</span>
            <span className="font-mono font-semibold text-emerald-400">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0a3641] text-white p-3 rounded-xl shadow-xl border border-teal-500/30 text-xs space-y-1 z-50">
          <div className="font-bold text-amber-300">Data: {data.label} ({data.isoDate})</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-200">Novas inscrições no dia:</span>
            <strong className="font-mono text-white">{data.count}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-200">Acumulado até a data:</span>
            <strong className="font-mono text-emerald-300">{data.cumulative}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPostsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0a3641] text-white p-3 rounded-xl shadow-xl border border-amber-500/30 text-xs space-y-1 z-50">
          <div className="font-bold text-amber-300">{data.name}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-200">Postagens publicadas:</span>
            <strong className="font-mono text-white">{data.count}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-200">Participação no mural:</span>
            <strong className="font-mono text-emerald-300">{data.percentage}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  const yAxisWidthRole = isCompactScreen ? 102 : 140;
  const yAxisWidthSus = isCompactScreen ? 108 : 150;
  const yAxisWidthPosts = isCompactScreen ? 96 : 132;
  const pieOuterRadius = isCompactScreen ? 82 : 105;
  const pieInnerRadius = isCompactScreen ? 50 : 65;

  return (
    <div className="space-y-6">
      {/* Visual Dashboard Banner */}
      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-[#0a3641] via-[#0e4857] to-[#028090] text-white shadow-md border border-[#0f5466]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-teal-200 text-[11px] font-mono font-semibold backdrop-blur-xs border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>DASHBOARD ANALÍTICO EM TEMPO REAL · SUS CARANGOLA</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
              Painel Visual Interativo de Inscrições & Postagens
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-3xl leading-relaxed">
              Gráficos dinâmicos atualizados instantaneamente conforme o uso da plataforma: categorias profissionais, níveis do SUS, evolução diária das inscrições e engajamento no mural comunitário.
            </p>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <div className="text-[10px] text-teal-200 font-medium uppercase tracking-wider">Inscritos</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-0.5">{totalRegistrations}</div>
              <div className="text-[10px] text-emerald-300">Base Ativa</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <div className="text-[10px] text-teal-200 font-medium uppercase tracking-wider">Categorias</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono mt-0.5">{insights.activeRolesCount}</div>
              <div className="text-[10px] text-amber-200/90">Ocupações</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <div className="text-[10px] text-teal-200 font-medium uppercase tracking-wider">Eixo RAPS</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono mt-0.5">{insights.coreRapsPct}%</div>
              <div className="text-[10px] text-teal-200">ESF+CAPS+Farm.</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <div className="text-[10px] text-teal-200 font-medium uppercase tracking-wider">Postagens</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-200 font-mono mt-0.5">{totalPosts}</div>
              <div className="text-[10px] text-rose-200">{totalPostLikes} curtidas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 4 Recharts Visual Dashboards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ----------------- CHART 1: CATEGORIA PROFISSIONAL ----------------- */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0a3641]/10 text-[#0a3641] flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-[#0a3641]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 flex flex-wrap items-center gap-2">
                    <span>1. Categoria Profissional / Ocupação</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Distribuição dos participantes por função e especialidade
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                <div className="inline-flex p-0.5 bg-stone-100 rounded-lg text-xs font-medium border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setRoleChartType('bar')}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roleChartType === 'bar'
                        ? 'bg-white text-[#0a3641] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="Gráfico de Barras Horizontais"
                  >
                    <BarChart2 className="w-3.5 h-3.5 rotate-90" />
                    <span className="hidden sm:inline">Barras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleChartType('column')}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roleChartType === 'column'
                        ? 'bg-white text-[#0a3641] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="Gráfico de Colunas Verticais"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Colunas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleChartType('pie')}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roleChartType === 'pie'
                        ? 'bg-white text-[#0a3641] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="Gráfico Circular Donut"
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Donut</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setRoleViewLimit(roleViewLimit === 'top8' ? 'all' : 'top8')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  {roleViewLimit === 'top8' ? 'Top 8' : 'Todos'}
                </button>
              </div>
            </div>

            <div className="pt-4 h-[340px] sm:h-[380px] w-full">
              {displayedRoleData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  Nenhum dado cadastrado para exibição no gráfico.
                </div>
              ) : roleChartType === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayedRoleData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 4, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      tick={{ fill: '#334155', fontSize: isCompactScreen ? 10 : 11, fontWeight: 500 }}
                      width={yAxisWidthRole}
                      interval={0}
                    />
                    <Tooltip content={<CustomRoleTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Inscritos"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                      animationDuration={650}
                    >
                      {displayedRoleData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={
                            entry.name.toLowerCase().includes('farmac')
                              ? '#10b981'
                              : ROLE_COLORS[index % ROLE_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : roleChartType === 'column' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayedRoleData}
                    margin={{ top: 15, right: 12, left: -12, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fill: '#334155', fontSize: 10, fontWeight: 500 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomRoleTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Inscritos"
                      radius={[6, 6, 0, 0]}
                      barSize={22}
                      animationDuration={650}
                    >
                      {displayedRoleData.map((entry, index) => (
                        <Cell
                          key={`col-cell-${entry.name}`}
                          fill={
                            entry.name.toLowerCase().includes('farmac')
                              ? '#10b981'
                              : ROLE_COLORS[index % ROLE_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="relative h-full flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="82%">
                    <PieChart>
                      <Pie
                        data={displayedRoleData.filter((d) => d.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={pieInnerRadius}
                        outerRadius={pieOuterRadius}
                        paddingAngle={3}
                        dataKey="count"
                        animationDuration={650}
                      >
                        {displayedRoleData
                          .filter((d) => d.count > 0)
                          .map((entry, index) => (
                            <Cell
                              key={`pie-cell-${entry.name}`}
                              fill={
                                entry.name.toLowerCase().includes('farmac')
                                  ? '#10b981'
                                  : ROLE_COLORS[index % ROLE_COLORS.length]
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip content={<CustomRoleTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[41%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-xl sm:text-2xl font-black text-[#0a3641] font-mono leading-none block">
                      {totalRegistrations}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                      Inscritos
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-h-20 overflow-y-auto">
                    {displayedRoleData.slice(0, 6).map((entry, idx) => (
                      <span
                        key={entry.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: entry.name.toLowerCase().includes('farmac')
                              ? '#10b981'
                              : ROLE_COLORS[idx % ROLE_COLORS.length]
                          }}
                        />
                        <span className="truncate max-w-[110px]">{entry.shortName}</span>
                        <strong className="font-mono text-stone-900">{entry.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                Maior presença: <strong>{insights.topRole.name}</strong> ({insights.topRole.count})
              </span>
            </div>
            <span className="font-mono text-[11px] text-stone-400">
              {insights.activeRolesCount} categorias com inscritos
            </span>
          </div>
        </div>

        {/* ----------------- CHART 2: NÍVEL DE ATENÇÃO NO SUS ----------------- */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#028090]/10 text-[#028090] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#028090]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    2. Nível de Atenção no SUS & RAPS
                  </h3>
                  <p className="text-xs text-stone-500">
                    Vínculo institucional nas portas de entrada e serviços
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <div className="inline-flex p-0.5 bg-stone-100 rounded-lg text-xs font-medium border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setSusChartType('bar')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      susChartType === 'bar'
                        ? 'bg-white text-[#0a3641] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5 rotate-90" />
                    <span>Barras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSusChartType('pie')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      susChartType === 'pie'
                        ? 'bg-white text-[#0a3641] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span>Donut</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 h-[340px] sm:h-[380px] w-full">
              {susLevelData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  Nenhum dado cadastrado para exibição no gráfico.
                </div>
              ) : susChartType === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={susLevelData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 4, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      tick={{ fill: '#334155', fontSize: isCompactScreen ? 10 : 11, fontWeight: 500 }}
                      width={yAxisWidthSus}
                      interval={0}
                    />
                    <Tooltip content={<CustomSusTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Profissionais"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                      animationDuration={650}
                    >
                      {susLevelData.map((entry, index) => (
                        <Cell
                          key={`sus-cell-${entry.fullName}`}
                          fill={getSusLevelColor(entry.fullName, index)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="relative h-full flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="82%">
                    <PieChart>
                      <Pie
                        data={susLevelData.filter((d) => d.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={pieInnerRadius}
                        outerRadius={pieOuterRadius}
                        paddingAngle={3}
                        dataKey="count"
                        animationDuration={650}
                      >
                        {susLevelData
                          .filter((d) => d.count > 0)
                          .map((entry, index) => (
                            <Cell
                              key={`sus-pie-cell-${entry.fullName}`}
                              fill={getSusLevelColor(entry.fullName, index)}
                            />
                          ))}
                      </Pie>
                      <Tooltip content={<CustomSusTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[41%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-xl sm:text-2xl font-black text-[#028090] font-mono leading-none block">
                      {insights.activeLevelsCount}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                      Portas SUS
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-h-20 overflow-y-auto">
                    {susLevelData.slice(0, 6).map((entry, idx) => (
                      <span
                        key={entry.fullName}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: getSusLevelColor(entry.fullName, idx)
                          }}
                        />
                        <span className="truncate max-w-[110px]">{entry.shortName}</span>
                        <strong className="font-mono text-stone-900">{entry.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#028090] shrink-0" />
              <span>
                Integração RAPS: <strong>{insights.coreRapsPct}%</strong> da plateia
              </span>
            </div>
            <div className="text-[11px] font-mono text-stone-400">
              {insights.activeLevelsCount} de {SUS_CARE_LEVELS.length} níveis ativos
            </div>
          </div>
        </div>

        {/* ----------------- CHART 3: EVOLUÇÃO DIÁRIA DE INSCRIÇÕES ----------------- */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    3. Evolução das Inscrições por Data
                  </h3>
                  <p className="text-xs text-stone-500">
                    Ritmo diário e curva acumulada de inscritos em tempo real
                  </p>
                </div>
              </div>

              <div className="inline-flex p-0.5 bg-stone-100 rounded-lg text-xs font-medium border border-stone-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimelineChartType('area')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    timelineChartType === 'area'
                      ? 'bg-white text-[#0a3641] shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Acumulado
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineChartType('bar')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    timelineChartType === 'bar'
                      ? 'bg-white text-[#0a3641] shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Por Dia
                </button>
              </div>
            </div>

            <div className="pt-4 h-[290px] sm:h-[320px] w-full">
              {timelineData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  Nenhuma data de inscrição registrada.
                </div>
              ) : timelineChartType === 'area' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 16, left: -12, bottom: 10 }}>
                    <defs>
                      <linearGradient id="susTimelineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#028090" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#028090" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTimelineTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#028090"
                      strokeWidth={2.5}
                      fill="url(#susTimelineFill)"
                      animationDuration={650}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 10, right: 16, left: -12, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTimelineTooltip />} />
                    <Bar dataKey="count" fill="#ea7a38" radius={[6, 6, 0, 0]} barSize={26} animationDuration={650} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span>Campo: <strong className="font-mono">registeredAt</strong></span>
            <span>{timelineData.length} dia(s) com novas inscrições</span>
          </div>
        </div>

        {/* ----------------- CHART 4: POSTAGENS NO MURAL DA COMUNIDADE ----------------- */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#ea7a38]/15 text-[#d96522] flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#d96522]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    4. Postagens Feitas no Mural da Comunidade
                  </h3>
                  <p className="text-xs text-stone-500">
                    Análise interativa por território, categoria e mídia
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200 self-start sm:self-auto">
                {[
                  { id: 'city', label: 'Município' },
                  { id: 'role', label: 'Categoria' },
                  { id: 'media', label: 'Mídia' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPostsDimension(opt.id as typeof postsDimension)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      postsDimension === opt.id
                        ? 'bg-white text-[#0a3641] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 h-[290px] sm:h-[320px] w-full">
              {postsChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  Nenhuma postagem publicada no mural ainda.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={postsChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 4, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      tick={{ fill: '#334155', fontSize: isCompactScreen ? 10 : 11, fontWeight: 500 }}
                      width={yAxisWidthPosts}
                      interval={0}
                    />
                    <Tooltip content={<CustomPostsTooltip />} />
                    <Bar dataKey="count" name="Postagens" radius={[0, 6, 6, 0]} barSize={20} animationDuration={650}>
                      {postsChartData.map((entry, idx) => (
                        <Cell key={`post-cell-${entry.name}`} fill={ROLE_COLORS[(idx + 3) % ROLE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span>Total: <strong>{totalPosts} postagens</strong> · <strong>{totalPostLikes} curtidas</strong></span>
            <span>Atualização automática ao publicar ou excluir</span>
          </div>
        </div>

      </div>

      {/* Cross-Analysis Strategic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0a3641] uppercase tracking-wide">
            <Layers className="w-4 h-4 text-[#028090]" />
            <span>Articulação em Rede</span>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono">
            {insights.coreRaps} profissionais ({insights.coreRapsPct}%)
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            Profissionais lotados diretamente na Atenção Primária, CAPS e Atenção Farmacêutica garantem forte alinhamento no fluxo de referência e contrarreferência.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0a3641] uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-[#ea7a38]" />
            <span>Multidisciplinaridade</span>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono">
            {insights.activeRolesCount} categorias ativas
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            Representação diversificada entre psicologia, enfermagem, medicina, farmácia, serviço social e agentes comunitários, enriquecendo os debates dos 3 pilares temáticos.
          </p>
        </div>
      </div>
    </div>
  );
};
