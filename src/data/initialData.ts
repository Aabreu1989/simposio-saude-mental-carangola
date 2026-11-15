import { EventConfig, CertificateDesignConfig, BadgeDesignConfig, ThematicAxis, ScheduleSession, Registration, DownloadMaterial, SocialPost, PushNotificationItem, NewsletterSubscriber, EvaluationFeedback, SpeakerProfile } from '../types.ts';

export const DEFAULT_EVENT_HASHTAGS =
  '#SaudeMentalCarangola #CuidadoEmLiberdade #SUSMicrorregiao #RAPSCarangola #CarangolaMG';

export const INITIAL_CERTIFICATE_DESIGN: CertificateDesignConfig = {
  primaryColor: '#0a3641',
  accentColor: '#ea7a38',
  secondaryColor: '#028090',
  backgroundColor: '#ffffff',
  borderStyle: 'double',
  layoutTheme: 'raps_waves',
  fontFamily: 'serif',
  institutionTopLine: 'República Federativa do Brasil · Estado de Minas Gerais',
  institutionName: 'PREFEITURA MUNICIPAL DE CARANGOLA · SECRETARIA MUNICIPAL DE SAÚDE',
  institutionSub: 'UEMG Carangola · Rede de Atenção Psicossocial (RAPS) Microrregional',
  badgeLabel: '',
  mainTitle: 'CERTIFICADO',
  preNameText: 'Certificamos formalmente que',
  bodyTemplate:
    'participou ativamente e com aproveitamento pleno das atividades do {evento}, realizado no dia {data}, das {horario}, nas dependências da {local}, cumprindo carga horária total de {carga_horaria} de conferências magistrais, mesas-redondas e oficinas deliberativas de fortalecimento da Rede de Atenção Psicossocial.',
  footerQuote: '',
  showBannerImage: false,
  bannerImageUrl: '',
  showThematicAxes: true,
  showBottomWaves: false,
  showWatermark: true,
  watermarkText: 'SUS',
  showQrValidation: true,
  signature1Name: 'Amanda Silveira Abreu',
  signature1Role: 'Coordenação de Saúde Mental',
  signature1Org: 'Rede de Atenção Psicossocial · Carangola/MG',
  signature2Name: 'Gisella Loiola Consensa',
  signature2Role: 'Secretária Municipal de Saúde',
  signature2Org: 'Gestão Microrregional SUS / Minas Gerais'
};

export const INITIAL_BADGE_DESIGN: BadgeDesignConfig = {
  layoutTheme: 'institutional_lanyard',
  primaryColor: '#0a3641',
  accentColor: '#ea7a38',
  secondaryColor: '#028090',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  headerLabel: 'SISTEMA ÚNICO DE SAÚDE · RAPS MICRORREGIONAL',
  subHeaderLabel: 'Carangola · Minas Gerais',
  footerLabel: 'UEMG Carangola · Cuidado em Liberdade',
  accreditedBadgeLabel: 'CREDENCIADO · PRESENTE',
  pendingBadgeLabel: 'AGUARDANDO CHECK-IN',
  showLogo: true,
  showQrCode: true,
  showCity: true,
  showInstitution: true,
  showAxisInterest: true,
  showCareLevel: false,
  showLanyardSlot: true,
  paperFormat: 'a6'
};

export const INITIAL_EVENT_CONFIG: EventConfig = {
  editionTitle: '1º Simpósio de Saúde Mental',
  regionTitle: 'da Microrregião de Carangola',
  subtitle: 'Um espaço de diálogo, reflexão e construção coletiva sobre os desafios e os caminhos da Saúde Mental no nosso território.',
  eventDate: '08 de dezembro',
  eventFullDate: '08 de Dezembro de 2026',
  eventHours: '7h30 às 16h30',
  locationName: 'UEMG Carangola',
  locationAddress: 'Praça Cel. Maximiano, 180 - Centro, Carangola - MG, 36800-000',
  contactEmail: 'saudemental.carangola@sus.mg.gov.br',
  contactPhone: '(32) 3741-2500',
  maxSpots: 200,
  certificateWorkload: 8,
  bannerImage: '/assets/banner-oficial-simposio-saude-mental-carangola.jpg',
  isRegistrationOpen: true,
  organizer: 'Secretaria Municipal de Saúde de Carangola · Colegiado Gestor da RAPS Microrregional',
  googleFormsUrl: '',
  googleSheetsSyncUrl: '',
  enableGoogleFormsOption: false,
  certificateDesign: INITIAL_CERTIFICATE_DESIGN,
  badgeDesign: INITIAL_BADGE_DESIGN
};

export const THEMATIC_AXES: ThematicAxis[] = [
  {
    id: 'eixo-1',
    number: 1,
    title: 'Fluxograma da RAPS (Rede de Atenção Psicossocial)',
    shortTitle: 'Fluxograma da RAPS',
    description: 'Mapeamento e integração entre a Atenção Básica (ESF/UBS), CAPS, SAMU 192 e atenção especializada. Estratégias para garantir o fluxo contínuo e humanizado do usuário nos municípios da microrregião.',
    icon: 'network',
    color: 'text-[#0a3641]',
    bgColor: 'bg-[#e2f0f2]'
  },
  {
    id: 'eixo-2',
    number: 2,
    title: 'Hospital Geral, leitos de retaguarda e pronto socorro – a realidade do nosso território',
    shortTitle: 'Hospital Geral & Leitos de Retaguarda',
    description: 'Diagnóstico dos atendimentos de urgência psiquiátrica na Casa de Caridade de Carangola e hospitais da região. Articulação com a retaguarda clínica e garantia de acolhimento sem estigmatização.',
    icon: 'hospital',
    color: 'text-[#d96522]',
    bgColor: 'bg-[#faeee5]'
  },
  {
    id: 'eixo-3',
    number: 3,
    title: 'Judicialização da Saúde Mental e o cuidado em liberdade',
    shortTitle: 'Judicialização & Cuidado em Liberdade',
    description: 'Debate intersetorial entre o SUS, Defensoria Pública, Ministério Público e Poder Judiciário da Comarca de Carangola sobre internações compulsórias, garantia da Lei 10.216/2001 e desinstitucionalização.',
    icon: 'justice',
    color: 'text-[#5a3e85]',
    bgColor: 'bg-[#f1edf8]'
  }
];

export const INITIAL_SCHEDULE: ScheduleSession[] = [
  {
    id: 'sch-1',
    timeStart: '07:30',
    timeEnd: '08:00',
    title: 'Credenciamento',
    type: 'credenciamento',
    location: 'Hall de Entrada - UEMG Carangola',
    description: 'Recepção dos participantes, validação de presença e retirada de crachás e materiais de apoio do simpósio.'
  },
  {
    id: 'sch-2',
    timeStart: '08:00',
    timeEnd: '08:30',
    title: 'Café com acolhimento: um encontro para chegar, conversar e fortalecer vínculos.',
    type: 'credenciamento',
    location: 'Hall de Entrada / Pátio - UEMG Carangola',
    description: 'Momento inicial de confraternização, chegada das equipes da microrregião e fortalecimento dos laços entre trabalhadores, usuários e familiares.'
  },
  {
    id: 'sch-3',
    timeStart: '08:30',
    timeEnd: '09:15',
    title: 'Abertura oficial: Quando nos encontramos, a Rede ganha vida!',
    type: 'abertura',
    location: 'Auditório UEMG Carangola',
    speakers: [
      {
        name: 'Raquel Martins Pinheiro',
        role: 'Supervisora Clínico Institucional',
        institution: 'Ministério da Saúde / Fiocruz no CAPS ad de Carangola'
      },
      {
        name: 'Christine Vianna Algarves Magalhães',
        role: 'Supervisora Clínico Institucional',
        institution: 'Ministério da Saúde e Fiocruz do CAPS I e do CAPS Infanto Juvenil'
      },
      {
        name: 'Gisella Loiola Consensa',
        role: 'Secretária de Saúde',
        institution: 'Secretaria Municipal de Saúde de Carangola'
      },
      {
        name: 'Camila Lima',
        role: 'Superintendente da Saúde Mental',
        institution: 'Superintendência de Saúde Mental'
      }
    ],
    description: 'Mesa solene de abertura com falas institucionais e afirmação do compromisso coletivo com o fortalecimento da RAPS na microrregião.'
  },
  {
    id: 'sch-4',
    timeStart: '09:15',
    timeEnd: '09:30',
    title: 'A arte que nos conecta',
    type: 'abertura',
    location: 'Auditório UEMG Carangola',
    description: 'Apresentação cultural. Música com afeto: a arte como expressão, encontro e cuidado.'
  },
  {
    id: 'sch-5',
    timeStart: '09:30',
    timeEnd: '11:30',
    title: 'Mesa 1: Encontros, afetos e redes que produzem cuidado e liberdade.',
    type: 'mesa',
    axisId: 'eixo-1',
    location: 'Auditório UEMG Carangola',
    mediator: {
      name: 'Camila Lima',
      role: 'Mediadora · Superintendente da Saúde Mental',
      institution: 'Superintendência de Saúde Mental'
    },
    description: 'Tema: Fluxograma da RAPS. Articulação entre Atenção Primária, CAPS e dispositivos do território para construção de fluxos integrados e Projetos Terapêuticos Singulares.'
  },
  {
    id: 'sch-6',
    timeStart: '11:30',
    timeEnd: '13:00',
    title: 'Intervalo para almoço',
    type: 'intervalo',
    location: 'Pátio Central - UEMG Carangola',
    description: 'Pausa para almoço e convivência entre as delegações e equipes participantes dos municípios da microrregião.'
  },
  {
    id: 'sch-7',
    timeStart: '13:00',
    timeEnd: '14:30',
    title: 'Mesa 2: Palavras que cuidam, histórias que transformam',
    type: 'mesa',
    axisId: 'eixo-2',
    location: 'Auditório UEMG Carangola',
    mediator: {
      name: 'Raquel Martins Pinheiro',
      role: 'Mediadora · Supervisora Clínico Institucional',
      institution: 'Ministério da Saúde / Fiocruz no CAPS ad de Carangola'
    },
    description: 'Tema: O hospital geral, leitos de retaguarda e pronto socorro. Acolhimento às crises, manejo humanizado e integração clínica na urgência e emergência.'
  },
  {
    id: 'sch-8',
    timeStart: '14:30',
    timeEnd: '14:45',
    title: 'Apresentação Centro de Convivência',
    type: 'plenaria',
    location: 'Auditório UEMG Carangola',
    description: 'Poemas que encantam: palavras que abraçam, provocam e fazem pensar. Momento cultural e de sensibilização.'
  },
  {
    id: 'sch-9',
    timeStart: '14:45',
    timeEnd: '16:00',
    title: 'Mesa 3: Redes que se encontram, cuidados que se constroem',
    type: 'mesa',
    axisId: 'eixo-3',
    location: 'Auditório UEMG Carangola',
    mediator: {
      name: 'Christine Vianna Algarves Magalhães',
      role: 'Mediadora · Supervisora Clínico Institucional',
      institution: 'Ministério da Saúde e Fiocruz · CAPS I e CAPS Infanto Juvenil'
    },
    description: 'Tema: A judicialização da saúde mental e o cuidado em liberdade. Diálogo intersetorial pela garantia de direitos e fortalecimento da Lei 10.216/2001.'
  },
  {
    id: 'sch-10',
    timeStart: '16:00',
    timeEnd: '16:30',
    title: 'Encerramento',
    type: 'encerramento',
    location: 'Auditório e Hall - UEMG Carangola',
    description: 'Café de despedida: Levar conosco os encontros, os afetos e a vontade de fazer diferente. A realidade do território.'
  }
];

export const INITIAL_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-001',
    code: 'CAR-SM-001',
    fullName: 'Amanda Silveira Abreu',
    cpf: '102.345.678-90',
    cns: '702304958123001',
    email: 'amandasabreu89@gmail.com',
    phone: '(32) 99841-2233',
    city: 'Carangola',
    professionalRole: 'Psicólogo(a)',
    institution: 'CAPS I Carangola - SMS',
    axisInterest: 'Eixo 1: Fluxograma da RAPS',
    accessibilityNeeds: 'Nenhuma',
    status: 'presente',
    registeredAt: '2026-11-01T09:14:00Z',
    checkedInAt: '2026-12-08T08:35:12Z',
    certificateIssued: true,
    instagram: '@amanda.silveira.psico',
    linkedin: 'linkedin.com/in/amanda-silveira-abreu',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Especialização / Residência',
    susCareLevel: 'Atenção Psicossocial Especializada (CAPS I, CAPS II, CAPS AD)',
    referralSource: 'Grupo de WhatsApp do SUS / Trabalho',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-002',
    code: 'CAR-SM-002',
    fullName: 'Lucas Resende Faria',
    cpf: '098.765.432-11',
    cns: '701293847561002',
    email: 'lucas.resende@esperafeliz.mg.gov.br',
    phone: '(32) 98877-4411',
    city: 'Espera Feliz',
    professionalRole: 'Enfermeiro(a)',
    institution: 'Estratégia Saúde da Família (ESF Central)',
    axisInterest: 'Eixo 2: Hospital Geral & Leitos de Retaguarda',
    status: 'presente',
    registeredAt: '2026-11-01T10:45:00Z',
    checkedInAt: '2026-12-08T08:42:00Z',
    certificateIssued: true,
    instagram: '@lucas.enf.sus',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Superior Completo',
    susCareLevel: 'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)',
    referralSource: 'Ofício / Comunicado da Secretaria de Saúde',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-003',
    code: 'CAR-SM-003',
    fullName: 'Marina Duarte Pimentel',
    cpf: '076.543.210-99',
    cns: '704512398701003',
    email: 'marina.duarte@tombos.mg.gov.br',
    phone: '(32) 99123-7890',
    city: 'Tombos',
    professionalRole: 'Assistente Social',
    institution: 'CRAS / Secretaria de Assistência Social',
    axisInterest: 'Eixo 3: Judicialização & Cuidado em Liberdade',
    status: 'presente',
    registeredAt: '2026-11-02T14:20:00Z',
    checkedInAt: '2026-12-08T08:50:45Z',
    certificateIssued: true,
    linkedin: 'linkedin.com/in/marina-pimentel-social',
    ageGroup: '40 a 49 anos',
    educationLevel: 'Especialização / Residência',
    susCareLevel: 'Assistência Social (CRAS, CREAS, Acolhimento)',
    referralSource: 'Colega de Equipe / Indicação de Amigo',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-004',
    code: 'CAR-SM-004',
    fullName: 'Dr. Leonardo Campos Valente',
    cpf: '045.123.789-55',
    cns: '709823415671004',
    email: 'leonardo.campos@hospitalcarangola.com.br',
    phone: '(32) 99901-3322',
    city: 'Carangola',
    professionalRole: 'Médico(a) Psiquiatra',
    institution: 'Casa de Caridade de Carangola',
    axisInterest: 'Eixo 2: Hospital Geral & Leitos de Retaguarda',
    status: 'presente',
    registeredAt: '2026-11-02T16:05:00Z',
    checkedInAt: '2026-12-08T08:55:00Z',
    certificateIssued: true,
    instagram: '@drleonardocampos.psiq',
    linkedin: 'linkedin.com/in/leonardo-campos-psiquiatria',
    ageGroup: '40 a 49 anos',
    educationLevel: 'Mestrado',
    susCareLevel: 'Atenção Hospitalar & Urgência (Hospital Casa de Caridade / PA / SAMU 192)',
    referralSource: 'Grupo de WhatsApp do SUS / Trabalho',
    acceptEmailNews: true,
    acceptWhatsappNews: false
  },
  {
    id: 'reg-005',
    code: 'CAR-SM-005',
    fullName: 'Patrícia Nogueira Barros',
    cpf: '112.233.445-66',
    cns: '703498215671005',
    email: 'patricia.barros@divino.mg.gov.br',
    phone: '(32) 98456-1122',
    city: 'Divino',
    professionalRole: 'Coordenador(a) / Gestor(a) de Saúde',
    institution: 'Secretaria Municipal de Saúde de Divino',
    axisInterest: 'Eixo 1: Fluxograma da RAPS',
    status: 'confirmada',
    registeredAt: '2026-11-03T11:30:00Z',
    certificateIssued: false,
    linkedin: 'linkedin.com/in/patricia-barros-gestao-saude',
    ageGroup: '50 a 59 anos',
    educationLevel: 'Mestrado',
    susCareLevel: 'Gestão Municipal / Secretaria de Saúde / Regulação',
    referralSource: 'Ofício / Comunicado da Secretaria de Saúde',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-006',
    code: 'CAR-SM-006',
    fullName: 'João Pedro de Paula',
    cpf: '055.667.889-00',
    cns: '708912347651006',
    email: 'joao.paula@pedradourada.mg.gov.br',
    phone: '(32) 99188-4455',
    city: 'Pedra Dourada',
    professionalRole: 'Agente Comunitário de Saúde (ACS)',
    institution: 'ESF Rural Pedra Dourada',
    axisInterest: 'Eixo 1: Fluxograma da RAPS',
    status: 'confirmada',
    registeredAt: '2026-11-03T17:15:00Z',
    certificateIssued: false,
    ageGroup: '18 a 29 anos',
    educationLevel: 'Ensino Médio / Técnico',
    susCareLevel: 'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)',
    referralSource: 'Cartaz impresso na Unidade de Saúde',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-007',
    code: 'CAR-SM-007',
    fullName: 'Beatriz Almeida Fontoura',
    cpf: '089.432.110-88',
    cns: '706789123451007',
    email: 'beatriz.fontoura@farialemos.mg.gov.br',
    phone: '(32) 98833-2211',
    city: 'Faria Lemos',
    professionalRole: 'Psicólogo(a)',
    institution: 'Núcleo Ampliado de Saúde da Família (eNASF)',
    axisInterest: 'Eixo 3: Judicialização & Cuidado em Liberdade',
    status: 'confirmada',
    registeredAt: '2026-11-04T08:40:00Z',
    certificateIssued: false,
    instagram: '@beatriz_almeida_psi',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Superior Completo',
    susCareLevel: 'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)',
    referralSource: 'Colega de Equipe / Indicação de Amigo',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-008',
    code: 'CAR-SM-008',
    fullName: 'Renata Lacerda Ramos',
    cpf: '034.789.012-33',
    cns: '705432198761008',
    email: 'renata.ramos@orizania.mg.gov.br',
    phone: '(32) 99955-8822',
    city: 'Orizânia',
    professionalRole: 'Terapeuta Ocupacional',
    institution: 'Centro de Reabilitação Municipal',
    axisInterest: 'Eixo 1: Fluxograma da RAPS',
    status: 'confirmada',
    registeredAt: '2026-11-04T15:25:00Z',
    certificateIssued: false,
    instagram: '@renata.to_saudemental',
    linkedin: 'linkedin.com/in/renata-lacerda-to',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Superior Completo',
    susCareLevel: 'Atenção Psicossocial Especializada (CAPS I, CAPS II, CAPS AD)',
    referralSource: 'Instagram / Redes Sociais',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-009',
    code: 'CAR-SM-009',
    fullName: 'Thiago Mendes Soares',
    cpf: '123.456.789-01',
    cns: '702134567891009',
    email: 'thiago.soares@caiana.mg.gov.br',
    phone: '(32) 98412-9900',
    city: 'Caiana',
    professionalRole: 'Médico(a) de Família e Comunidade',
    institution: 'UBS Caiana',
    axisInterest: 'Eixo 2: Hospital Geral & Leitos de Retaguarda',
    status: 'confirmada',
    registeredAt: '2026-11-05T09:10:00Z',
    certificateIssued: false,
    ageGroup: '30 a 39 anos',
    educationLevel: 'Especialização / Residência',
    susCareLevel: 'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)',
    referralSource: 'Ofício / Comunicado da Secretaria de Saúde',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-010',
    code: 'CAR-SM-010',
    fullName: 'Helena Matos Guimarães',
    cpf: '067.890.123-44',
    cns: '701122334451010',
    email: 'helena.guimaraes@carangola.mg.gov.br',
    phone: '(32) 99144-7766',
    city: 'Carangola',
    professionalRole: 'Usuário(a) do SUS / Familiar / Liderança Comunitária',
    institution: 'Associação de Familiares e Amigos da Saúde Mental',
    axisInterest: 'Eixo 3: Judicialização & Cuidado em Liberdade',
    status: 'confirmada',
    registeredAt: '2026-11-05T14:40:00Z',
    certificateIssued: false,
    ageGroup: '60 anos ou mais',
    educationLevel: 'Ensino Médio / Técnico',
    susCareLevel: 'Usuário(a) do SUS / Familiar / Controle Social',
    referralSource: 'Cartaz impresso na Unidade de Saúde',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  },
  {
    id: 'reg-011',
    code: 'CAR-SM-011',
    fullName: 'Mariana Duarte Alvarenga',
    cpf: '115.678.901-22',
    cns: '702405819230011',
    email: 'mariana.duarte@carangola.mg.gov.br',
    phone: '(32) 99882-3344',
    city: 'Carangola',
    professionalRole: 'Farmacêutico(a)',
    institution: 'Farmácia de Minas / Assistência Farmacêutica de Carangola',
    axisInterest: 'Eixo 1: Fluxograma da RAPS',
    status: 'confirmada',
    registeredAt: '2026-11-06T10:15:00Z',
    certificateIssued: false,
    instagram: '@mariana.farmasus',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Superior Completo',
    susCareLevel: 'Atenção Farmacêutica',
    referralSource: 'Ofício / Comunicado da Secretaria de Saúde',
    acceptEmailNews: true,
    acceptWhatsappNews: true
  }
];

export const INITIAL_MATERIALS: DownloadMaterial[] = [
  {
    id: 'mat-1',
    title: 'Guia Estratégico para o Cuidado de Pessoas com Necessidades Relacionadas ao Consumo de Álcool e Outras Drogas: Guia AD',
    category: 'Cartilha',
    author: 'Ministério da Saúde (CGMAD/DAPES) · OPAS/OMS · UNODC · SENAD',
    format: 'PDF',
    size: '8.1 MB',
    fileName: 'Guia-Estrategico-Cuidado-Alcool-e-Outras-Drogas-Guia-AD.pdf',
    description: 'Guia oficial do Ministério da Saúde com diretrizes estratégicas e operacionais para a Rede de Atenção Psicossocial (RAPS): acolhimento de baixa exigência, elaboração de Projetos Terapêuticos Singulares (PTS), redução de danos, prevenção e articulação com o sistema de justiça.',
    pages: 100,
    downloadsCount: 0,
    fileUrl: '/assets/guia-estrategico-cuidado-alcool-outras-drogas.pdf'
  },
  {
    id: 'mat-2',
    title: 'Atenção Psicossocial a Crianças e Adolescentes no SUS: Tecendo Redes para Garantir Direitos',
    category: 'Legislação',
    author: 'Ministério da Saúde (SAS/CGSM) · Conselho Nacional do Ministério Público (CNMP)',
    format: 'PDF',
    size: '3.3 MB',
    fileName: 'atencao_psicossocial_criancas_adolescentes_sus.pdf',
    description: 'Publicação conjunta MS/CNMP sobre a proteção integral infantojuvenil no SUS: marcos legais (ECA, Sinase, Lei nº 10.216/2001), diretrizes para o CAPSij, atenção a crises, medidas socioeducativas e articulação intersetorial entre Saúde Mental e Justiça da Infância e Juventude.',
    pages: 60,
    downloadsCount: 0,
    fileUrl: '/assets/atencao-psicossocial-criancas-adolescentes-sus.pdf'
  },
  {
    id: 'mat-3',
    title: 'Livro Tecendo Redes: Enfrentando as violências contra as mulheres',
    category: 'Apostila',
    author: 'Josiane Nunes Maia & Marselle Nobre de Carvalho (Orgs.) · Editora Rede UNIDA',
    format: 'PDF',
    size: '913 KB',
    fileName: 'Livro-Tecendo-redes-Enfrentando-as-violencias-contra-as-mulheres.pdf',
    description: 'Livro da Série Interlocuções Práticas, Experiências e Pesquisas em Saúde (Rede UNIDA/UEL/CAPES). Analisa o trabalho em rede de atenção psicossocial e intersetorial, marcos legais (Lei Maria da Penha, Feminicídio e Notificação Compulsória) e estratégias de acolhimento e proteção às mulheres em situação de violência.',
    pages: 92,
    downloadsCount: 0,
    fileUrl: '/assets/livro-tecendo-redes-violencias-mulheres.pdf'
  },
  {
    id: 'mat-4',
    title: 'Livro Mais substâncias para o trabalho em saúde com usuários de drogas',
    category: 'Apostila',
    author: 'Tatiana Ramminger & Martinho Silva (Orgs.) · Editora Rede UNIDA',
    format: 'PDF',
    size: '1.3 MB',
    fileName: 'Livro-Mais-substancias-para-o-trabalho-em-saude-com-usuarios-de-drogas.pdf',
    description: 'Obra de referência da Série Micropolítica do Trabalho e o Cuidado em Saúde (Rede UNIDA). Reúne 14 ensaios e pesquisas sobre Reforma Psiquiátrica, Redução de Danos, clínica ampliada no território, supervisão clínico-institucional em CAPS e o papel do vínculo no cuidado em saúde mental.',
    pages: 252,
    downloadsCount: 0,
    fileUrl: '/assets/livro-mais-substancias-trabalho-saude-drogas.pdf'
  },
  {
    id: 'mat-5',
    title: 'Termo de Responsabilidade de Cessão de Uso de Espaço - Auditório UEMG Carangola',
    category: 'Legislação',
    author: 'Secretaria Municipal de Saúde de Carangola & UEMG - Unidade Carangola',
    format: 'PDF',
    size: '452 KB',
    fileName: 'Termo-de-Responsabilidade-Cessao-de-Uso-UEMG-Carangola.pdf',
    description: 'Termo oficial de cessão e responsabilidade de uso do Auditório da Universidade do Estado de Minas Gerais (UEMG - Unidade Carangola) para a realização do 1º Simpósio de Saúde Mental do SUS, formalizado em 08/12/2026.',
    pages: 3,
    downloadsCount: 0,
    fileUrl: '/assets/termo-responsabilidade-cessao-espaco-uemg.pdf'
  }
];

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'post-8',
    authorName: 'Coordenação RAPS Carangola',
    authorRole: 'Comissão Organizadora',
    city: 'Carangola',
    content: 'Tudo pronto no auditório da UEMG Carangola para receber profissionais, gestores e lideranças dos municípios da nossa microrregião! A saúde mental é construída em rede e com afeto.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.18.58_PM_260a5969.jpeg',
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 10 minutos',
    timestamp: 1796727600000
  },
  {
    id: 'post-7',
    authorName: 'Amanda Abreu',
    authorRole: 'Psicóloga do CAPS',
    city: 'Carangola',
    content: 'Momento histórico para nossa microrregião. Discutir o cuidado em liberdade e o fortalecimento do SUS nunca foi tão urgente e necessário!',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    likes: 0,
    hasLiked: true,
    createdAt: 'Há 35 minutos',
    timestamp: 1796726100000
  },
  {
    id: 'post-6',
    authorName: 'Equipe ESF Rural',
    authorRole: 'Atenção Básica',
    city: 'Espera Feliz',
    content: 'Presença confirmada da delegação de Espera Feliz! Viemos em peso para alinhar o fluxograma da RAPS e aproximar o CAPS do nosso posto de saúde.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 1 hora',
    timestamp: 1796724000000
  },
  {
    id: 'post-5',
    authorName: 'Marina Pimentel',
    authorRole: 'Assistência Social',
    city: 'Tombos',
    content: 'Intersetorialidade na prática: Saúde Mental, CRAS e Justiça dialogando no mesmo auditório. Parabéns aos organizadores pelo tema certeiro.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 2 horas',
    timestamp: 1796720400000
  },
  {
    id: 'post-4',
    authorName: 'Equipe CAPS AD Carangola',
    authorRole: 'Redução de Danos & Cuidado',
    city: 'Carangola',
    content: 'Compartilhando nossos projetos terapêuticos singulares construídos no território. Cada história acolhida fortalece a clínica ampliada do SUS.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.18.58_PM_96fea5bf.jpeg',
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 3 horas',
    timestamp: 1796716800000
  },
  {
    id: 'post-3',
    authorName: 'Dr. Lucas Resende',
    authorRole: 'Enfermeiro ESF',
    city: 'Fervedouro',
    content: 'Expectativa alta para os debates sobre leitos de retaguarda no hospital geral e o fluxo ágil com o SAMU 192 na nossa microrregião.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 4 horas',
    timestamp: 1796713200000
  },
  {
    id: 'post-2',
    authorName: 'Comitê Intersetorial RAPS',
    authorRole: 'Gestão Municipal',
    city: 'Divino',
    content: 'Delegação de Divino já organizada para o Simpósio! Vamos construir juntos protocolos integrados entre Educação, Saúde e Assistência Social.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 5 horas',
    timestamp: 1796709600000
  },
  {
    id: 'post-1',
    authorName: 'Núcleo de Educação Permanente',
    authorRole: 'Apoio Institucional SUS',
    city: 'Pedra Dourada',
    content: 'Os materiais de apoio na Área de Downloads já estão servindo de base para nossas rodas de conversa pré-simpósio com os Agentes Comunitários.',
    hashtags: DEFAULT_EVENT_HASHTAGS,
    likes: 0,
    hasLiked: false,
    createdAt: 'Há 6 horas',
    timestamp: 1796706000000
  }
];

export const SPEAKERS_PROFILES: SpeakerProfile[] = [
  {
    id: 'spk-raquel-pinheiro',
    name: 'Raquel Martins Pinheiro',
    role: 'Supervisora Clínico-Institucional',
    institution: 'Ministério da Saúde / Fiocruz · CAPS AD Carangola',
    sessionGroup: 'mesa-2',
    sessionLabel: 'Abertura Solene & Mediação Mesa 2',
    sessionTime: '08:30 – 09:15 · 13:00 – 14:30',
    bio: 'Supervisora clínico-institucional vinculada ao projeto Ministério da Saúde/Fiocruz no CAPS AD de Carangola, apoiando equipes no cuidado territorial, redução de danos e articulação em rede.',
    socials: {
      instagram: '@capsad.carangola',
      instagramUrl: 'https://www.instagram.com/',
      linkedin: 'Raquel Martins Pinheiro · Fiocruz/MS',
      linkedinUrl: 'https://www.linkedin.com/',
      lattesUrl: 'https://lattes.cnpq.br/'
    }
  },
  {
    id: 'spk-christine-vianna',
    name: 'Christine Vianna Algarves Magalhães',
    role: 'Supervisora Clínico-Institucional',
    institution: 'Ministério da Saúde / Fiocruz · CAPS I e CAPS IJ',
    sessionGroup: 'mesa-3',
    sessionLabel: 'Abertura Solene & Mediação Mesa 3',
    sessionTime: '08:30 – 09:15 · 14:45 – 16:00',
    bio: 'Supervisora clínico-institucional do Ministério da Saúde e Fiocruz junto ao CAPS I e CAPS Infantojuvenil, fortalecendo práticas intersetoriais e proteção integral de crianças, jovens e famílias.',
    socials: {
      instagram: '@raps.carangola',
      instagramUrl: 'https://www.instagram.com/',
      linkedin: 'Christine Vianna · Fiocruz/MS',
      linkedinUrl: 'https://www.linkedin.com/',
      lattesUrl: 'https://lattes.cnpq.br/'
    }
  },
  {
    id: 'spk-camila-lima',
    name: 'Camila Lima',
    role: 'Superintendente de Saúde Mental',
    institution: 'Superintendência de Saúde Mental',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Abertura Solene & Mediação Mesa 1',
    sessionTime: '08:30 – 09:15 · 09:30 – 11:30',
    bio: 'Gestora pública à frente da Superintendência de Saúde Mental, articulando políticas microrregionais, educação permanente das equipes e implantação integrada da Rede de Atenção Psicossocial.',
    socials: {
      instagram: '@saudemental.carangola',
      instagramUrl: 'https://www.instagram.com/',
      linkedin: 'Camila Lima · Saúde Mental SUS',
      linkedinUrl: 'https://www.linkedin.com/'
    }
  },
  {
    id: 'spk-gisella-consensa',
    name: 'Gisella Loiola Consensa',
    role: 'Secretária Municipal de Saúde',
    institution: 'Secretaria Municipal de Saúde de Carangola',
    sessionGroup: 'abertura',
    sessionLabel: 'Abertura Solene Oficial',
    sessionTime: '08:30 – 09:15',
    bio: 'Secretária Municipal de Saúde de Carangola, liderando a cooperação interfederativa entre os municípios da microrregião para consolidação dos serviços de saúde pública e da RAPS no SUS.',
    socials: {
      instagram: '@saude.carangola',
      instagramUrl: 'https://www.instagram.com/',
      linkedin: 'Secretaria Municipal de Saúde · Carangola',
      linkedinUrl: 'https://www.linkedin.com/'
    }
  }
];

// Alertas vazios por padrão — o gestor cria os alertas no Painel do Gestor
export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = [];

export const INITIAL_SUBSCRIBERS: NewsletterSubscriber[] = [
  {
    id: 'sub-1',
    email: 'amandasabreu89@gmail.com',
    name: 'Amanda Silveira Abreu',
    role: 'Psicóloga',
    city: 'Carangola',
    receiveWhatsapp: true,
    phone: '(32) 99841-2233',
    subscribedAt: '2026-11-01'
  },
  {
    id: 'sub-2',
    email: 'lucas.resende@esperafeliz.mg.gov.br',
    name: 'Lucas Resende Faria',
    role: 'Enfermeiro',
    city: 'Espera Feliz',
    receiveWhatsapp: true,
    phone: '(32) 98877-4411',
    subscribedAt: '2026-11-01'
  },
  {
    id: 'sub-3',
    email: 'marina.duarte@tombos.mg.gov.br',
    name: 'Marina Duarte Pimentel',
    role: 'Assistente Social',
    city: 'Tombos',
    receiveWhatsapp: false,
    subscribedAt: '2026-11-02'
  },
  {
    id: 'sub-4',
    email: 'saude.farialemos@farialemos.mg.gov.br',
    name: 'Secretaria de Saúde Faria Lemos',
    role: 'Gestor',
    city: 'Faria Lemos',
    receiveWhatsapp: true,
    phone: '(32) 98833-2211',
    subscribedAt: '2026-11-03'
  }
];

export const REGIONAL_CITIES = [
  'Carangola',
  'Espera Feliz',
  'Divino',
  'Tombos',
  'Faria Lemos',
  'Pedra Dourada',
  'Caiana',
  'Orizânia',
  'São Francisco do Glória',
  'Outros'
];

export const PROFESSIONAL_ROLES = [
  'Psicólogo(a)',
  'Enfermeiro(a)',
  'Farmacêutico(a)',
  'Médico(a) Psiquiatra',
  'Médico(a) de Família e Comunidade / Clínico Geral',
  'Assistente Social',
  'Agente Comunitário de Saúde (ACS)',
  'Agente de Combate a Endemias (ACE)',
  'Terapeuta Ocupacional',
  'Fonoaudiólogo(a) / Fisioterapeuta',
  'Técnico(a) de Enfermagem',
  'Coordenador(a) / Gestor(a) de Saúde',
  'Profissional do Judiciário / Defensoria / MP',
  'Profissional da Assistência Social (CRAS/CREAS)',
  'Usuário(a) do SUS / Familiar / Liderança Comunitária',
  'Estudante / Residente',
  'Outros'
];

export const SUS_CARE_LEVELS = [
  'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)',
  'Atenção Psicossocial Especializada (CAPS I, CAPS II, CAPS AD)',
  'Atenção Farmacêutica',
  'Atenção Hospitalar & Urgência (Hospital Casa de Caridade / PA / SAMU 192)',
  'Gestão Municipal / Secretaria de Saúde / Regulação',
  'Assistência Social (CRAS, CREAS, Acolhimento)',
  'Sistema de Justiça & Direitos Humanos (TJMG / MP / Defensoria)',
  'Academia / Universidade / Estudante / Residente',
  'Usuário(a) do SUS / Familiar / Controle Social',
  'Outro Vínculo'
];

export const INITIAL_EVALUATIONS: EvaluationFeedback[] = [
  {
    id: 'eval-1',
    respondentName: 'Amanda Silveira Abreu',
    respondentRole: 'Psicólogo(a)',
    city: 'Carangola',
    npsScore: 10,
    ratingOrganization: 5,
    ratingSpeakers: 5,
    ratingRelevance: 5,
    ratingVenue: 5,
    favoriteSession: 'Eixo 1: Fluxograma da RAPS – Da Atenção Primária ao Cuidado Especializado',
    comment: 'Evento transformador para a microrregião! A clareza no fluxograma entre CAPS e as UBS vai desatar nós que tínhamos há anos no encaminhamento de crises.',
    createdAt: '2026-12-08T16:15:00Z'
  },
  {
    id: 'eval-2',
    respondentName: 'Lucas Resende Faria',
    respondentRole: 'Enfermeiro(a)',
    city: 'Espera Feliz',
    npsScore: 9,
    ratingOrganization: 5,
    ratingSpeakers: 5,
    ratingRelevance: 5,
    ratingVenue: 4,
    favoriteSession: 'Eixo 2: O Desafio do Hospital Geral, Leitos de Retaguarda e Urgência no Território',
    comment: 'O debate sobre leitos integrais de retaguarda na Casa de Caridade foi fundamental. Precisamos dessa aproximação com os hospitais gerais.',
    createdAt: '2026-12-08T16:20:00Z'
  },
  {
    id: 'eval-3',
    respondentName: 'Marina Duarte Pimentel',
    respondentRole: 'Assistente Social',
    city: 'Tombos',
    npsScore: 10,
    ratingOrganization: 5,
    ratingSpeakers: 5,
    ratingRelevance: 5,
    ratingVenue: 5,
    favoriteSession: 'Eixo 3: Judicialização da Saúde Mental e a Defesa Irrestrita do Cuidado em Liberdade',
    comment: 'Momento histórico ver Defensoria Pública, Judiciário e SUS sentados na mesma mesa defendendo a Lei 10.216 e o cuidado em liberdade.',
    createdAt: '2026-12-08T16:35:00Z'
  },
  {
    id: 'eval-4',
    respondentName: 'João Pedro de Paula',
    respondentRole: 'Agente Comunitário de Saúde (ACS)',
    city: 'Pedra Dourada',
    npsScore: 9,
    ratingOrganization: 4,
    ratingSpeakers: 5,
    ratingRelevance: 5,
    ratingVenue: 4,
    favoriteSession: 'Eixo 1: Fluxograma da RAPS – Da Atenção Primária ao Cuidado Especializado',
    comment: 'A cartilha distribuída e as orientações para nós agentes comunitários vão salvar vidas nas visitas domiciliares. Que venha a 2ª edição!',
    createdAt: '2026-12-08T16:42:00Z'
  },
  {
    id: 'eval-5',
    respondentName: 'Patrícia Nogueira Barros',
    respondentRole: 'Coordenador(a) / Gestor(a) de Saúde',
    city: 'Divino',
    npsScore: 10,
    ratingOrganization: 5,
    ratingSpeakers: 4,
    ratingRelevance: 5,
    ratingVenue: 5,
    favoriteSession: 'Plenária Coletiva: Redação da Carta de Carangola em Defesa da RAPS',
    comment: 'A Carta de Carangola terá respaldo no Colegiado Interfederativo da nossa região de saúde. Organização e acolhimento impecáveis.',
    createdAt: '2026-12-08T16:50:00Z'
  },
  {
    id: 'eval-6',
    respondentName: 'Dr. Leonardo Campos Valente',
    respondentRole: 'Médico(a) Psiquiatra',
    city: 'Carangola',
    npsScore: 8,
    ratingOrganization: 4,
    ratingSpeakers: 5,
    ratingRelevance: 4,
    ratingVenue: 4,
    favoriteSession: 'Eixo 2: O Desafio do Hospital Geral, Leitos de Retaguarda e Urgência no Território',
    comment: 'Muito proveitoso o diálogo clínico entre o pronto-socorro geral e a rede ambulatorial. Sugiro mais tempo para debate aberto da plateia no próximo ano.',
    createdAt: '2026-12-08T16:58:00Z'
  }
];

