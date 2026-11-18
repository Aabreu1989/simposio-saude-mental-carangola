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
  organizer: 'Superintendência de Saúde Mental · Supervisão clínico institucional da RAPS · Secretaria Municipal de Saúde de Carangola',
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
    description: 'Credenciamento e recepção dos participantes.'
  },
  {
    id: 'sch-2',
    timeStart: '08:00',
    timeEnd: '08:30',
    title: 'Café com acolhimento: um encontro para chegar, conversar e fortalecer vínculos.',
    type: 'credenciamento',
    location: 'Hall de Entrada / Pátio - UEMG Carangola',
    description: 'Um encontro para chegar, conversar e fortalecer vínculos.'
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
        name: 'Superintendência de Saúde Mental',
        role: 'Coordenação do Simpósio',
        institution: 'Coordenação RAPS'
      },
      {
        name: 'Supervisão clínico institucional da RAPS',
        role: 'Coordenação do Simpósio',
        institution: 'Coordenação RAPS'
      },
      {
        name: 'Secretaria Municipal de Saúde de Carangola',
        role: 'Coordenação do Simpósio',
        institution: 'Prefeitura de Carangola'
      }
    ],
    description: 'Abertura oficial: Quando nos encontramos, a Rede ganha vida! Coordenação do Simpósio: Superintendência de Saúde Mental, Supervisão clínico institucional da RAPS e Secretaria Municipal de Saúde de Carangola.'
  },
  {
    id: 'sch-4',
    timeStart: '09:15',
    timeEnd: '09:30',
    title: 'A arte que nos conecta',
    type: 'abertura',
    location: 'Auditório UEMG Carangola',
    description: 'Apresentação cultural.\nMúsica com afeto: a arte como expressão, encontro e cuidado.'
  },
  {
    id: 'sch-5',
    timeStart: '09:30',
    timeEnd: '11:30',
    title: 'Mesa 1 Encontros, afetos e redes que produzem cuidado e liberdade.',
    type: 'mesa',
    axisId: 'eixo-1',
    location: 'Auditório UEMG Carangola',
    mediator: {
      name: 'Camila Lima',
      role: 'Mediadora',
      institution: 'Mesa 1 · Fluxograma'
    },
    speakers: [
      {
        name: 'Marta Elizabeth de Souza',
        role: 'Psicóloga · Militante da Luta Antimanicomial em MG',
        institution: 'CECO'
      },
      {
        name: 'Patricia Amaral',
        role: 'Debatedora',
        institution: 'CAPS ij'
      },
      {
        name: 'Flávia Silva Cardoso',
        role: 'Debatedora',
        institution: 'CAPS 1'
      },
      {
        name: 'Kendyson Campos',
        role: 'Debatedor',
        institution: 'CAPS 1'
      },
      {
        name: 'Lilian Oliveira',
        role: 'Debatedora',
        institution: 'CAPS ad'
      },
      {
        name: 'Karina dos Santos Heitor',
        role: 'Debatedora',
        institution: 'CAPS ad'
      },
      {
        name: 'Amanda de Souza Lopes',
        role: 'Debatedora',
        institution: 'CECO'
      }
    ],
    description: 'Tema: Fluxograma'
  },
  {
    id: 'sch-6',
    timeStart: '11:30',
    timeEnd: '13:00',
    title: 'Intervalo para almoço',
    type: 'intervalo',
    location: 'Pátio Central - UEMG Carangola',
    description: '11:30 às 13:00h intervalo para almoço'
  },
  {
    id: 'sch-7',
    timeStart: '13:00',
    timeEnd: '13:30',
    title: 'Apresentaçao Centro de Convivência',
    type: 'plenaria',
    location: 'Auditório UEMG Carangola',
    description: 'Poemas que encantam: palavras que abraçam, provocam e fazem pensar.\nMomento cultural e de sensibilização.'
  },
  {
    id: 'sch-8',
    timeStart: '13:30',
    timeEnd: '14:30',
    title: 'Mesa 2 Palavras que cuidam, histórias que transformam',
    type: 'mesa',
    axisId: 'eixo-2',
    location: 'Auditório UEMG Carangola',
    mediator: {
      name: 'Raquel Pinheiro',
      role: 'Mediadora',
      institution: 'Mesa 2 · O hospital geral, leitos de retaguarda e pronto socorro'
    },
    speakers: [
      {
        name: 'Gisele de Souza Gomes',
        role: 'Assistente Social',
        institution: 'UFJF · CAPS I Carangola'
      },
      {
        name: 'Juliana',
        role: 'Debatedora',
        institution: 'GRS'
      }
    ],
    description: 'Tema: O hospital geral, leitos de retaguarda e pronto socorro.'
  },
  {
    id: 'sch-9',
    timeStart: '14:30',
    timeEnd: '15:30',
    title: 'Mesa 3 Redes que se encontram, cuidados que se constroem',
    type: 'mesa',
    axisId: 'eixo-3',
    location: 'Auditório UEMG Carangola',
    mediator: {
      name: 'Christine Vianna',
      role: 'Mediadora',
      institution: 'Mesa 3 · A judiciarização da saúde mental e o cuidado em liberdade'
    },
    speakers: [
      {
        name: 'Cristiana Marina Barros de Souza',
        role: 'Coordenação Pedagógica Nós na Rede (MS/Fiocruz)',
        institution: 'Nós na Rede · Ministério da Saúde / Fiocruz'
      },
      {
        name: 'Marcos Alexandre',
        role: 'Debatedor',
        institution: 'Mesa 3'
      },
      {
        name: 'Ricardo Moebus',
        role: 'Médico Psiquiatra · Professor e Pesquisador',
        institution: 'Escola de Medicina UFOP · CAPS Infância e Juventude Ouro Preto'
      }
    ],
    description: 'Tema:  A judiciarização da saúde mental e o cuidado em liberdade'
  },
  {
    id: 'sch-10',
    timeStart: '15:30',
    timeEnd: '16:00',
    title: 'Debate do dia',
    type: 'plenaria',
    location: 'Auditório UEMG Carangola',
    description: 'Debate do dia'
  },
  {
    id: 'sch-11',
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
    id: 'mat-caps-bem-te-quero-2026',
    title: 'Supervisão Clínico-Institucional na RAPS: CAPS Como Bem Te Quero',
    category: 'Cartilha',
    author: 'Ana Marta Lobosque, Silvio Yasuí, Károl Veiga Cabral · Fiocruz Brasília (NUSMAD) · Ministério da Saúde (DESMAD)',
    format: 'PDF',
    size: '2.2 MB',
    fileName: 'caps_como_bem_te_quero_supervisao_raps_fiocruz_ms_2026.pdf',
    description: 'Livro oficial de referência nacional da Fiocruz e Ministério da Saúde (DESMAD/NUSMAD, 2026) para a supervisão clínico-institucional em mais de 300 CAPS. Resgata os pilares da Reforma Psiquiátrica e do cuidado em liberdade: portas abertas sem regulação de vagas, acolhimento, vínculo, corresponsabilização, permanência-dia, hospitalidade noturna, atenção à crise, interdisciplinaridade, Projeto Terapêutico Singular (PTS), território, apoio matricial, controle social e redução de danos.',
    pages: 36,
    downloadsCount: 0,
    fileUrl: '/materiais/caps_como_bem_te_quero_supervisao_raps_fiocruz_ms_2026.pdf'
  },
  {
    id: 'mat-eap-desinst-2026',
    title: 'Cuidado, Território e Direitos: Orientações à Equipe de Avaliação e Acompanhamento de Medidas Terapêuticas (EAP-Desinst)',
    category: 'Legislação',
    author: 'Ministério da Saúde · Secretaria de Atenção Especializada à Saúde (SAES / Desmad)',
    format: 'PDF',
    size: '2.3 MB',
    fileName: 'cuidado_territorio_direitos_orientacoes_eap_desinst_ms_2026.pdf',
    description: 'Documento orientador oficial do Ministério da Saúde para o processo de desinstitucionalização de pessoas com transtorno mental em conflito com a lei, no âmbito da Política Antimanicomial do Poder Judiciário. Inclui modelos de Avaliação Biopsicossocial Multiprofissional (Anexo A), Ficha de Encaminhamento (Anexo B) e Plano Terapêutico de Acompanhamento (Anexo C).',
    pages: 98,
    downloadsCount: 0,
    fileUrl: '/materiais/cuidado_territorio_direitos_orientacoes_eap_desinst_ms_2026.pdf'
  },
  {
    id: 'mat-guia-raps-mg-2022',
    title: 'Guia para o Trabalho nas Redes de Atenção Psicossocial em Minas Gerais: Diretrizes e Orientações',
    category: 'Apostila',
    author: 'Escola de Saúde Pública de Minas Gerais (ESP-MG) · Secretaria de Estado de Saúde de Minas Gerais (SES-MG / DSMAD)',
    format: 'PDF',
    size: '2.0 MB',
    fileName: 'guia_trabalho_redes_atencao_psicossocial_mg_espmg_sesmg.pdf',
    description: 'Publicação oficial da ESP-MG e SES-MG orientando o trabalho nas RAPS mineiras: políticas estaduais (PESMAD), financiamento estadual (Resoluções CIB-SUS/MG), pontos de atenção (CAPS, SRT, Leitos em Hospital Geral), conceitos-ferramenta de clínica ampliada, acolhimento, PTS, matriciamento e redução de danos.',
    pages: 91,
    downloadsCount: 0,
    fileUrl: '/materiais/guia_trabalho_redes_atencao_psicossocial_mg_espmg_sesmg.pdf'
  },
  {
    id: 'mat-guia-crise-raps-2026',
    title: 'Guia de Acolhimento à Crise em Saúde Mental na Rede de Atenção Psicossocial (Raps)',
    category: 'Fluxograma',
    author: 'Ministério da Saúde · Secretaria de Atenção Especializada à Saúde (SAES / Desmad)',
    format: 'PDF',
    size: '3.0 MB',
    fileName: 'guia_acolhimento_crise_saude_mental_raps_ms_2026.pdf',
    description: 'Diretrizes clínicas e operacionais revisadas de 2026 do Ministério da Saúde para o acolhimento humanizado em situações de crise: planos de crise antecipados, técnicas de desescalonamento, contenção física como último recurso, avaliação de risco de suicídio, manejo de intoxicação/abstinência por álcool e drogas, acolhimento infantojuvenil e fluxogramas práticos de cuidados.',
    pages: 88,
    downloadsCount: 0,
    fileUrl: '/materiais/guia_acolhimento_crise_saude_mental_raps_ms_2026.pdf'
  },
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
  }
];

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [
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
  }
];

export const SPEAKERS_PROFILES: SpeakerProfile[] = [
  {
    id: 'spk-camila-lima',
    name: 'Camila Lima',
    role: 'Mediadora',
    institution: 'Mesa 1 · Fluxograma',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    photoUrl: 'https://lh3.googleusercontent.com/d/1qPmMioljImchVKsJXMxcdD2DtBR-F5ea',
    photoPosition: 'center 18%',
    bio: '',
    socials: {
      instagram: '@saudemental.carangola',
      instagramUrl: 'https://www.instagram.com/saudemental.carangola'
    }
  },
  {
    id: 'spk-patricia-amaral',
    name: 'Patricia Amaral',
    role: 'Debatedora',
    institution: 'CAPS ij',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-flavia',
    name: 'Flávia Silva Cardoso',
    role: 'Debatedora',
    institution: 'CAPS 1',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-kendyson',
    name: 'Kendyson Campos',
    role: 'Debatedor',
    institution: 'CAPS 1',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-lilian',
    name: 'Lilian Oliveira',
    role: 'Debatedora',
    institution: 'CAPS ad',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-karina',
    name: 'Karina dos Santos Heitor',
    role: 'Debatedora',
    institution: 'CAPS ad',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-amanda',
    name: 'Amanda de Souza Lopes',
    role: 'Debatedora',
    institution: 'CECO',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma',
    sessionTime: '09:30 – 11:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-marta-elizabeth',
    name: 'Marta Elizabeth de Souza',
    role: 'Psicóloga · Militante da Luta Antimanicomial em MG',
    institution: 'CECO · Fórum Mineiro de Saúde Mental / RENILA',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · Fluxograma da RAPS',
    sessionTime: '09:30 – 11:30',
    photoUrl: 'https://lh3.googleusercontent.com/d/1wa5ODL3uWgnrpM89TvEBQwAoP3fKH_-d',
    photoPosition: 'center 18%',
    bio: 'Psicóloga, militante da Luta Antimanicomial e integrante do Fórum Mineiro de Saúde Mental / RENILA.\n• Ex-Coordenadora Estadual de Saúde Mental da SES/MG - Secretaria de Estado de Saúde de Minas Gerais.\n• Presidente do CRP-MG - Conselho Regional de Psicologia - 4ª Região, XIII Plenário (Conselheira Presidente).\n• Coordenadora Interina Estadual de Saúde Mental/SES-MG em 2004, designada para a Comissão Nacional de Acompanhamento do Processo de Reestruturação da Assistência Hospitalar Psiquiátrica no SUS.',
    socials: {}
  },
  {
    id: 'spk-raquel-pinheiro',
    name: 'Raquel Pinheiro',
    role: 'Mediadora',
    institution: 'Mesa 2 · O hospital geral, leitos de retaguarda e pronto socorro',
    sessionGroup: 'mesa-2',
    sessionLabel: 'Mesa 2 · Hospital Geral e Urgência',
    sessionTime: '13:30 – 14:30',
    photoUrl: 'https://lh3.googleusercontent.com/d/164x1fTpuX5ccozFhrOyIII3Dda-EutZo',
    photoPosition: 'center 18%',
    bio: 'Terapeuta Ocupacional. Especialista em Saúde Mental. Experto em dependências (UCM - Espanha). MBA Executivo em Saúde. Especialista em Gestão de Redes de Atenção à Saúde. Ex-diretora e Terapeuta do Centro Mineiro de Toxicomania/ FHEMIG. Supervisora Clínico Institucional.',
    socials: {
      instagram: '@capsad.carangola',
      instagramUrl: 'https://www.instagram.com/capsad.carangola'
    }
  },
  {
    id: 'spk-gisele-souza',
    name: 'Gisele de Souza Gomes',
    role: 'Assistente Social · Especialista em Saúde Mental',
    institution: 'UFJF · CAPS I Carangola',
    sessionGroup: 'mesa-2',
    sessionLabel: 'Mesa 2 · Hospital Geral e Urgência',
    sessionTime: '13:30 – 14:30',
    photoUrl: 'https://lh3.googleusercontent.com/d/1oTUz3LV55E7_oFaiJuonOk4UzpcFfZ-1',
    photoPosition: 'center 18%',
    bio: 'Assistente Social, graduada pela Universidade Federal de Juiz de Fora (UFJF), especialista em Saúde Mental pela mesma instituição. Possui formação em Terapia Familiar e Psicanálise, além de participação no curso Nós na Rede, da Fundação Oswaldo Cruz (Fiocruz). Atua na área da Saúde Mental desde sua formação acadêmica, período em que participou de pesquisa nos hospitais psiquiátricos de Juiz de Fora. Possui experiência profissional em clínica psiquiátrica, tendo atuado também na construção da rede de atenção psicossocial de Carangola, integrando a primeira equipe do CAPS I do município.',
    socials: {}
  },
  {
    id: 'spk-juliana-grs',
    name: 'Juliana',
    role: 'Debatedora',
    institution: 'GRS',
    sessionGroup: 'mesa-2',
    sessionLabel: 'Mesa 2 · Hospital Geral e Urgência',
    sessionTime: '13:30 – 14:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-christine-vianna',
    name: 'Christine Vianna',
    role: 'Mediadora',
    institution: 'Mesa 3 · A judiciarização da saúde mental e o cuidado em liberdade',
    sessionGroup: 'mesa-3',
    sessionLabel: 'Mesa 3 · Judicialização e Direitos',
    sessionTime: '14:30 – 15:30',
    photoUrl: 'https://lh3.googleusercontent.com/d/1ECDp9a7CYDobMLRnRHKdKkJ1H8QlAsoY',
    photoPosition: 'center 18%',
    bio: 'Supervisora clínico institucional da Rede de Atenção Psicossocial de Carangola, RAPS.\n\nGraduação em Artes Plásticas pela Universidade do Estado de Minas Gerais (UEMG), com especializações em Análise Institucional, Esquizoanálise e Esquizodrama; Assistência aos Usuários de Álcool e Outras Drogas; Políticas de Saúde Mental e Atenção Psicossocial; Arteterapia; e Pesquisa e Ensino no Campo das Artes Plásticas. Experiência no SUS desde 2000.',
    socials: {
      instagram: '@raps.carangola',
      instagramUrl: 'https://www.instagram.com/raps.carangola'
    }
  },
  {
    id: 'spk-cristiana-marina',
    name: 'Cristiana Marina Barros de Souza',
    role: 'Psicóloga · Coordenação Pedagógica Nós na Rede (MS/Fiocruz)',
    institution: 'Nós na Rede · Ministério da Saúde / Fiocruz',
    sessionGroup: 'mesa-3',
    sessionLabel: 'Mesa 3 · Judicialização e Direitos',
    sessionTime: '14:30 – 15:30',
    photoUrl: '/assets/cristiana-marina.jpg',
    photoPosition: 'center 35%',
    bio: 'Psicóloga pela PUC Minas, com pós-graduação em Saúde Mental pela PUC Minas e Mestrado em Promoção da Saúde e Prevenção da Violência na UFMG (Departamento de Saúde Coletiva).\n\nPossui 18 anos de experiência na RAPS de Belo Horizonte. Professora universitária das disciplinas de internato de saúde mental e pós-graduação da PUC Minas, psicopatologia e saúde coletiva do curso de psicologia da Faculdade Anhanguera. Foi supervisora clínica institucional do CAPSIJ dos municípios de Ribeirão das Neves e Ouro Preto. Atualmente atua na coordenação pedagógica e como apoiadora educacional do projeto Nós na Rede da FIOCRUZ / Ministério da Saúde.',
    socials: {}
  },
  {
    id: 'spk-marcos-alexandre',
    name: 'Marcos Alexandre',
    role: 'Debatedor',
    institution: 'Mesa 3 · A judiciarização da saúde mental e o cuidado em liberdade',
    sessionGroup: 'mesa-3',
    sessionLabel: 'Mesa 3 · Judicialização e Direitos',
    sessionTime: '14:30 – 15:30',
    bio: '',
    socials: {}
  },
  {
    id: 'spk-ricardo-moebus',
    name: 'Dr. Ricardo Luiz Narciso Moebus',
    role: 'Médico Psiquiatra · Professor e Pesquisador',
    institution: 'Escola de Medicina UFOP · CAPS Infância e Juventude Ouro Preto',
    sessionGroup: 'mesa-3',
    sessionLabel: 'Mesa 3 · Judicialização e Direitos',
    sessionTime: '14:30 – 15:30',
    photoUrl: 'https://lh3.googleusercontent.com/d/1xllBR5PaSr5y39gBITmcxU-tvRVTAv5U',
    photoPosition: 'center 18%',
    bio: 'Médico psiquiatra, professor e pesquisador brasileiro.\n\nFormação Acadêmica:\n• Medicina: Universidade Federal de Minas Gerais (UFMG), formado em 1994.\n• Especialização: Psiquiatria e Psiquiatria da Infância e Adolescência pela Fundação Hospitalar do Estado de Minas Gerais (FHEMIG).\n• Mestrado e Doutorado: Medicina pela Universidade Federal do Rio de Janeiro (UFRJ).\n• Pós-doutorado: Racionalidades da Saúde pela Universidade Federal Fluminense (UFF).\n\nAtuação Profissional:\n• Docência: Professor associado do Departamento de Medicina de Família, Saúde Mental e Coletiva da Escola de Medicina da Universidade Federal de Ouro Preto (UFOP).\n• Saúde Pública: Atua como psiquiatra no CAPS Infância e Juventude em Ouro Preto, além de desenvolver pesquisas em áreas como saúde coletiva, dependências químicas.',
    socials: {}
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

