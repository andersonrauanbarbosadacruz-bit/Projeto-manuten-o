import { ChecklistItemTemplate, ChecklistRecord, ChecklistType, DroneAsset, Vehicle, VehicleMonthlyUpdate, WorkOrder } from '../types';

export const CHECKLIST_TEMPLATES: Record<ChecklistType, ChecklistItemTemplate[]> = {
  SALA_DE_MAQUINAS: [
    { id: 'sm_1', description: 'Nível do óleo dos compressores', requiresImage: true, category: 'Compressores' },
    { id: 'sm_2', description: 'Tencionamento das correias', requiresImage: false, category: 'Transmissão' },
    { id: 'sm_3', description: 'Proteção das correias', requiresImage: true, category: 'Segurança' },
    { id: 'sm_4', description: 'Lubrificação dos motores', requiresImage: false, category: 'Motores' },
    { id: 'sm_5', description: 'Nível de óleo das bombas de amônia', requiresImage: true, category: 'Amônia' },
    { id: 'sm_6', description: 'Acoplamento bomba de amônia', requiresImage: true, category: 'Amônia' },
    { id: 'sm_7', description: 'Nível de água dos condensadores', requiresImage: true, category: 'Condensadores' },
    { id: 'sm_8', description: 'Funcionamento das bombas de resfriamento dos cabeçote', requiresImage: false, category: 'Resfriamento' },
    { id: 'sm_9', description: 'Temperatura dos ambientes e câmaras', requiresImage: true, category: 'Câmaras / Termometria' }
  ],
  GERADOR: [
    { id: 'ger_1', description: 'Nível de água / aditivo do radiador', requiresImage: true, category: 'Arrefecimento' },
    { id: 'ger_2', description: 'Nível de óleo lubrificante do motor', requiresImage: true, category: 'Lubrificação' },
    { id: 'ger_3', description: 'Nível de combustível no tanque diário', requiresImage: true, category: 'Combustível' },
    { id: 'ger_4', description: 'Funcionamento e teste de partida por 5 minutos', requiresImage: true, category: 'Operação / Teste' },
    { id: 'ger_5', description: 'Tensão e carga das baterias de partida', requiresImage: false, category: 'Sistema Elétrico' }
  ],
  IRRIGACAO: [
    { id: 'ir_1', description: 'Verificar nível de óleo das bombas', requiresImage: true, category: 'Casa de Bombas' },
    { id: 'ir_2', description: 'Verificar acoplamento', requiresImage: true, category: 'Transmissão' },
    { id: 'ir_3', description: 'Verificar funcionamento dos equipamentos', requiresImage: true, category: 'Equipamentos' },
    { id: 'ir_4', description: 'Verificar se há vazamentos de água próximo as quandros elétricos', requiresImage: true, category: 'Segurança Elétrica' },
    { id: 'ir_5', description: 'Verificar iluminação', requiresImage: true, category: 'Infraestrutura' },
    { id: 'ir_6', description: 'Verificar funcionamento dos cooler', requiresImage: true, category: 'Painéis Elétricos' }
  ],
  DRONE: [
    { id: 'dr_1', description: 'Hélices', requiresImage: true, category: 'Propulsão / Aerodinâmica' },
    { id: 'dr_2', description: 'Discos rotativos', requiresImage: true, category: 'Atomização / Pulverização' },
    { id: 'dr_3', description: 'Calibração', requiresImage: true, category: 'Sensores & IMU' },
    { id: 'dr_4', description: 'Trem de pouso', requiresImage: true, category: 'Estrutura' },
    { id: 'dr_5', description: 'Tanque', requiresImage: true, category: 'Armazenamento de Calda' },
    { id: 'dr_6', description: 'Tampa do tanque', requiresImage: true, category: 'Vedação do Reservatório' },
    { id: 'dr_7', description: 'Radar Frontal', requiresImage: true, category: 'Anticolisão / Segurança' },
    { id: 'dr_8', description: 'Radar Inferior', requiresImage: true, category: 'Altímetro / Acompanhamento de Terreno' },
    { id: 'dr_9', description: 'Baterias', requiresImage: true, category: 'Alimentação & Células' },
    { id: 'dr_10', description: 'Limpeza do tanque pós-aplicação', requiresImage: true, category: 'Higienização Operacional' },
    { id: 'dr_11', description: 'Limpeza externa', requiresImage: true, category: 'Higienização Geral' },
    { id: 'dr_12', description: 'Limpeza dos discos', requiresImage: true, category: 'Higienização de Bicos' }
  ],
  VEICULO: [
    { id: 'vc_1', description: 'Verificar nível de óleo do motor', requiresImage: false, category: 'Motor & Fluídos' },
    { id: 'vc_2', description: 'Verificar água do radiador', requiresImage: false, category: 'Sistema de Arrefecimento' },
    { id: 'vc_3', description: 'Verificar calibragem dos pneus', requiresImage: false, category: 'Pneus & Rodagem' },
    { id: 'vc_4', description: 'Verificar step, macaco e chave de roda', requiresImage: false, category: 'Equipamentos Obrigatórios' },
    { id: 'vc_5', description: 'Verificar faróis e lanternas', requiresImage: false, category: 'Iluminação & Sinalização' },
    { id: 'vc_6', description: 'Lavagem ao término do uso', requiresImage: false, category: 'Conservação da Frota' }
  ]
};

export const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'v_1', model: 'ARGO', plate: 'TYY7F10' },
  { id: 'v_2', model: 'ARGO', plate: 'TYY7F12' },
  { id: 'v_3', model: 'ARGO', plate: 'TYY7F13' },
  { id: 'v_4', model: 'ARGO', plate: 'TYY7F14' },
  { id: 'v_5', model: 'ARGO', plate: 'TYY7F15' },
  { id: 'v_6', model: 'ARGO', plate: 'TYY7F16' },
  { id: 'v_7', model: 'ARGO', plate: 'TYY7F17' },
  { id: 'v_8', model: 'ARGO', plate: 'TYY7F18' },
  { id: 'v_9', model: 'ARGO', plate: 'TYY7F19' },
  { id: 'v_10', model: 'ARGO', plate: 'TYY7F20' },
  { id: 'v_11', model: 'ARGO', plate: 'TYY7F21' },
  { id: 'v_12', model: 'ARGO', plate: 'TYY7F22' },
  { id: 'v_13', model: 'ARGO', plate: 'TYY7F23' },
  { id: 'v_14', model: 'ARGO', plate: 'TYY7F24' },
  { id: 'v_15', model: 'ARGO', plate: 'TYY7F25' },
  { id: 'v_16', model: 'ARGO', plate: 'TYY7F26' },
  { id: 'v_17', model: 'ARGO', plate: 'TYY7F27' },
  { id: 'v_18', model: 'ARGO', plate: 'TYY7F28' },
  { id: 'v_19', model: 'ARGO', plate: 'TYY7F29' },
  { id: 'v_20', model: 'ARGO', plate: 'TYY7F30' },
  { id: 'v_21', model: 'ARGO', plate: 'TYZ3C75' },
  { id: 'v_22', model: 'POLO MAN', plate: 'UBQ7F95' },
  { id: 'v_23', model: 'POLO MAN', plate: 'UBQ7G96' },
  { id: 'v_24', model: 'POLO MAN', plate: 'UBQ7H05' },
  { id: 'v_25', model: 'POLO MAN', plate: 'UBQ9D52' },
  { id: 'v_26', model: 'POLO MAN', plate: 'UBQ9D53' },
  { id: 'v_27', model: 'POLO MAN', plate: 'UBR6A95' },
  { id: 'v_28', model: 'POLO AUT', plate: 'UBT8J27' },
  { id: 'v_29', model: 'STRADA', plate: 'UHP0H71' },
  { id: 'v_30', model: 'STRADA', plate: 'UHP0H81' },
  { id: 'v_31', model: 'STRADA', plate: 'UHP0I11' },
  { id: 'v_32', model: 'STRADA', plate: 'UHP0I21' },
  { id: 'v_33', model: 'SAVEIRO', plate: 'UDC9E76' },
  { id: 'v_34', model: 'SAVEIRO', plate: 'TBV4H79' },
  { id: 'v_35', model: 'RENEGADE', plate: 'UHO2C68' },
  { id: 'v_36', model: 'RENEGADE', plate: 'UHO2D78' },
  { id: 'v_37', model: 'RENEGADE', plate: 'UHP0C04' },
  { id: 'v_38', model: 'RENEGADE', plate: 'UHP3D26' },
  { id: 'v_39', model: 'COMPASS', plate: 'UHP5B82' },
  { id: 'v_temp_aaa0a00', model: 'VEÍCULO TEMPORÁRIO', plate: 'AAA0A00', isTemporary: true }
];

export const INITIAL_DRONES: DroneAsset[] = [
  { id: 'dr_asset_1', name: 'Drone 01', model: 'DJI T70P', label: 'Drone 01 (DJI T70P)' },
  { id: 'dr_asset_2', name: 'Drone 02', model: 'DJI T70P', label: 'Drone 02 (DJI T70P)' }
];

// SVG data-uris for instant realistic machinery & irrigation visual samples
const samplePumpLeakImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23334155"/><rect x="80" y="100" width="440" height="200" rx="10" fill="%23475569"/><circle cx="200" cy="200" r="60" fill="%2364748b"/><line x1="140" y1="200" x2="260" y2="200" stroke="%2394a3b8" stroke-width="8"/><path d="M350 180 Q370 230 350 250" stroke="%2338bdf8" stroke-width="6" fill="none"/><ellipse cx="360" cy="260" rx="40" ry="15" fill="%230284c7" opacity="0.7"/><text x="300" y="60" fill="%23f8fafc" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">REGISTRO FOTOGRÁFICO DE MANUTENÇÃO</text><text x="300" y="340" fill="%23fca5a5" font-size="16" font-family="sans-serif" text-anchor="middle">Vazamento identificado na junção da tubulação</text></svg>`;

const samplePumpRepairedImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><rect x="80" y="100" width="440" height="200" rx="10" fill="%2314532d"/><circle cx="200" cy="200" r="60" fill="%23166534"/><line x1="140" y1="200" x2="260" y2="200" stroke="%234ade80" stroke-width="8"/><rect x="330" y="180" width="45" height="70" rx="6" fill="%2322c55e"/><text x="300" y="60" fill="%23f8fafc" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">SERVIÇO CONCLUÍDO E TESTADO</text><text x="300" y="340" fill="%2386efac" font-size="16" font-family="sans-serif" text-anchor="middle">Vedação trocada, aperto ajustado e teste estanque 100% OK</text></svg>`;

const sampleOilLevelImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f172a"/><circle cx="300" cy="200" r="110" fill="%231e293b" stroke="%2394a3b8" stroke-width="12"/><circle cx="300" cy="200" r="85" fill="%23e2e8f0"/><rect x="215" y="200" width="170" height="85" fill="%23ca8a04"/><line x1="220" y1="160" x2="380" y2="160" stroke="%23ef4444" stroke-width="3" stroke-dasharray="6,4"/><text x="300" y="150" fill="%23ef4444" font-size="12" font-family="sans-serif" text-anchor="middle">MÍNIMO</text><line x1="220" y1="200" x2="380" y2="200" stroke="%2322c55e" stroke-width="3"/><text x="300" y="190" fill="%2315803d" font-size="12" font-family="sans-serif" text-anchor="middle">NÍVEL ATUAL (CONFORME)</text><text x="300" y="360" fill="%23f1f5f9" font-size="16" font-family="sans-serif" text-anchor="middle">Visor de Óleo do Compressor 02 - Nível Conforme</text></svg>`;

export const INITIAL_CHECKLISTS: ChecklistRecord[] = [
  {
    id: 'chk_1',
    code: 'CHK-001',
    type: 'SALA_DE_MAQUINAS',
    farm: 'Vale das Uvas',
    location: 'Central Frigorífica Principal',
    date: '2026-10-28',
    time: '07:30',
    inspector: 'Marcos Vinicius Silva',
    shift: 'Manhã',
    statusSummary: 'COM_PENDENCIAS',
    generalNotes: 'Verificação diária matinal. Necessário repor óleo do compressor 2 e ajustar correia.',
    items: [
      { itemId: 'sm_1', description: 'Nível do óleo dos compressores', status: 'N/C', requiresImage: true, photoUrl: sampleOilLevelImage, notes: 'Óleo abaixo do nível mínimo no visor do Compressor 02', generatedWorkOrderId: 'os_1' },
      { itemId: 'sm_2', description: 'Tencionamento das correias', status: 'C', requiresImage: false },
      { itemId: 'sm_3', description: 'Proteção das correias', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'sm_4', description: 'Lubrificação dos motores', status: 'C', requiresImage: false },
      { itemId: 'sm_5', description: 'Nível de óleo das bombas de amônia', status: 'C', requiresImage: true, photoUrl: sampleOilLevelImage },
      { itemId: 'sm_6', description: 'Acoplamento bomba de amônia', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'sm_7', description: 'Nível de água dos condensadores', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'sm_8', description: 'Funcionamento das bombas de resfriamento dos cabeçote', status: 'C', requiresImage: false },
      { itemId: 'sm_9', description: 'Temperatura dos ambientes e câmaras', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage, notes: 'Câmaras 1 a 4 operando a 0.5°C' }
    ],
    workOrderIds: ['os_1'],
    createdAt: '2026-10-28T07:45:00.000Z'
  },
  {
    id: 'chk_2',
    code: 'CHK-002',
    type: 'IRRIGACAO',
    farm: 'Labrunier 1',
    location: 'Casa de Bombas Setor B (Pivô 3 e 4)',
    date: '2026-10-28',
    time: '08:15',
    inspector: 'Roberto Alencar Santos',
    shift: 'Manhã',
    statusSummary: 'CRITICO',
    generalNotes: 'Vazamento de água detectado próximo ao quadro de comando elétrico.',
    items: [
      { itemId: 'ir_1', description: 'Verificar nível de óleo das bombas', status: 'C', requiresImage: true, photoUrl: sampleOilLevelImage },
      { itemId: 'ir_2', description: 'Verificar acoplamento', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_3', description: 'Verificar funcionamento dos equipamentos', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_4', description: 'Verificar se há vazamentos de água próximo as quandros elétricos', status: 'N/C', requiresImage: true, photoUrl: samplePumpLeakImage, notes: 'Gotejamento na conexão do manifold a 60cm do quadro geral', generatedWorkOrderId: 'os_2' },
      { itemId: 'ir_5', description: 'Verificar iluminação', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_6', description: 'Verificar funcionamento dos cooler', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage }
    ],
    workOrderIds: ['os_2'],
    createdAt: '2026-10-28T08:30:00.000Z'
  },
  {
    id: 'chk_3',
    code: 'CHK-003',
    type: 'IRRIGACAO',
    farm: 'Brasil Uvas',
    location: 'Estação de Filtragem e Fertirrigação Bloco 01',
    date: '2026-10-29',
    time: '06:50',
    inspector: 'Antônio Carlos Mendes',
    shift: 'Manhã',
    statusSummary: 'CONFORME',
    generalNotes: 'Tudo verificado em perfeita conformidade. Equipamentos operando normalmente.',
    items: [
      { itemId: 'ir_1', description: 'Verificar nível de óleo das bombas', status: 'C', requiresImage: true, photoUrl: sampleOilLevelImage },
      { itemId: 'ir_2', description: 'Verificar acoplamento', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_3', description: 'Verificar funcionamento dos equipamentos', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_4', description: 'Verificar se há vazamentos de água próximo as quandros elétricos', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_5', description: 'Verificar iluminação', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ir_6', description: 'Verificar funcionamento dos cooler', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage }
    ],
    createdAt: '2026-10-29T07:10:00.000Z'
  },
  {
    id: 'chk_4',
    code: 'CHK-004',
    type: 'GERADOR',
    farm: 'Brasil Uvas',
    location: 'Cabine de Força & Grupo Gerador 500kVA',
    date: '2026-10-29',
    time: '08:30',
    inspector: 'Antônio Carlos Mendes',
    shift: 'Manhã',
    statusSummary: 'CONFORME',
    generalNotes: 'Teste semanal de partida realizado. Gerador estabilizou em 220/380V e 60Hz. Nível de diesel e óleo conformes.',
    items: [
      { itemId: 'ger_1', description: 'Nível de água / aditivo do radiador', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage },
      { itemId: 'ger_2', description: 'Nível de óleo lubrificante do motor', status: 'C', requiresImage: true, photoUrl: sampleOilLevelImage },
      { itemId: 'ger_3', description: 'Nível de combustível no tanque diário', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage, notes: 'Tanque em 90%' },
      { itemId: 'ger_4', description: 'Funcionamento e teste de partida por 5 minutos', status: 'C', requiresImage: true, photoUrl: samplePumpRepairedImage, notes: 'Partida em 4 segundos, teste normal' },
      { itemId: 'ger_5', description: 'Tensão e carga das baterias de partida', status: 'C', requiresImage: false, notes: 'Baterias em 26.4Vcc (Flutuação OK)' }
    ],
    createdAt: '2026-10-29T08:45:00.000Z'
  }
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'os_1',
    code: 'OS-2026-001',
    farm: 'Vale das Uvas',
    equipment: 'Compressor Frigorífico nº 02 (Sabroe)',
    maintenanceType: 'CORRETIVA',
    date: '2026-10-28',
    time: '08:00',
    location: 'Central Frigorífica Principal - Sala de Máquinas',
    responsible: 'Marcos Vinicius Silva',
    thirdParty: 'Lubrifrios Serviços Técnicos',
    isThirdParty: true,
    problemDescription: 'Detectado baixo nível de óleo no visor do cárter do compressor de refrigeração nº 02 durante o checklist matinal da sala de máquinas. Risco de travamento do cabeçote se operar com pressão diferencial de óleo baixa.',
    materials: [
      { id: 'm1', name: 'Óleo Sintético Frigorífico ISO VG 68', quantity: 20, unit: 'Litros' },
      { id: 'm2', name: 'Filtro de sucção de óleo sobressalente', quantity: 1, unit: 'un' },
      { id: 'm3', name: 'Jogo de juntas de vedação', quantity: 1, unit: 'cj' }
    ],
    photosBefore: [
      {
        id: 'pb1',
        url: sampleOilLevelImage,
        caption: 'Visor de óleo acusando nível crítico antes da reposição',
        timestamp: '2026-10-28 08:05'
      }
    ],
    photosAfter: [
      {
        id: 'pa1',
        url: samplePumpRepairedImage,
        caption: 'Nível normalizado e filtro substituído com sucesso',
        timestamp: '2026-10-28 11:20'
      }
    ],
    status: 'CONCLUIDA',
    priority: 'ALTA',
    checklistSourceId: 'chk_1',
    checklistItemDescription: 'Nível do óleo dos compressores',
    solutionDescription: 'Realizada sangria parcial, substituição do filtro de óleo e adição de 20 litros de óleo ISO VG 68. Teste de pressão diferencial concluído com 3.2 bar (ótimo).',
    completionDate: '2026-10-28',
    completionTime: '11:30',
    createdAt: '2026-10-28T08:00:00.000Z',
    updatedAt: '2026-10-28T11:35:00.000Z'
  },
  {
    id: 'os_2',
    code: 'OS-2026-002',
    farm: 'Labrunier 1',
    equipment: 'Bomba Centrífuga de Irrigação 75CV - Bomba 02',
    maintenanceType: 'CORRETIVA',
    date: '2026-10-28',
    time: '08:40',
    location: 'Casa de Bombas Setor B (Pivô 3 e 4)',
    responsible: 'Roberto Alencar Santos',
    thirdParty: 'Não / Equipe Interna',
    isThirdParty: false,
    problemDescription: 'Vazamento contínuo de água na conexão flangeada do manifold de sucção da Bomba 02, escorrendo em direção ao pedestal do quadro elétrico de comando. Risco iminente de curto-circuito.',
    materials: [
      { id: 'm4', name: 'Anel de vedação de borracha nitrílica 4"', quantity: 2, unit: 'un' },
      { id: 'm5', name: 'Parafusos galvanizados sextavados 5/8 x 3"', quantity: 8, unit: 'un' },
      { id: 'm6', name: 'Fita veda-rosca industrial 18mm', quantity: 3, unit: 'rolos' }
    ],
    photosBefore: [
      {
        id: 'pb2',
        url: samplePumpLeakImage,
        caption: 'Gotejamento forte no flange acima da calha elétrica',
        timestamp: '2026-10-28 08:42'
      }
    ],
    photosAfter: [],
    status: 'EM_ANDAMENTO',
    priority: 'URGENTE',
    checklistSourceId: 'chk_2',
    checklistItemDescription: 'Verificar se há vazamentos de água próximo as quandros elétricos',
    createdAt: '2026-10-28T08:40:00.000Z',
    updatedAt: '2026-10-28T09:15:00.000Z'
  },
  {
    id: 'os_3',
    code: 'OS-2026-003',
    farm: 'Labrunier 2',
    equipment: 'Válvula Reguladora de Pressão e Ventosa Tríplice',
    maintenanceType: 'PREVENTIVA',
    date: '2026-10-29',
    time: '07:15',
    location: 'Linha Principal de Irrigação - Bloco 8',
    responsible: 'Diego Nogueira',
    thirdParty: 'AgroHidro Manutenções',
    isThirdParty: true,
    problemDescription: 'Manutenção preventiva e calibração periódica do manômetro e limpeza da válvula ventosa tríplice função do bloco de uvas de mesa.',
    materials: [
      { id: 'm7', name: 'Válvula ventosa tríplice função 2"', quantity: 1, unit: 'un' },
      { id: 'm8', name: 'Manômetro com glicerina 0-10 bar', quantity: 1, unit: 'un' }
    ],
    photosBefore: [
      {
        id: 'pb3',
        url: samplePumpLeakImage,
        caption: 'Ventosa danificada expelindo fluxo contínuo',
        timestamp: '2026-10-29 07:20'
      }
    ],
    photosAfter: [],
    status: 'ABERTA',
    priority: 'MEDIA',
    createdAt: '2026-10-29T07:15:00.000Z',
    updatedAt: '2026-10-29T07:15:00.000Z'
  }
];

const sampleCarFront = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M70 200 L90 140 L140 100 L260 100 L310 140 L330 200 Z" fill="%2338bdf8"/><rect x="80" y="190" width="240" height="50" rx="8" fill="%2364748b"/><circle cx="110" cy="190" r="15" fill="%23fef08a"/><circle cx="290" cy="190" r="15" fill="%23fef08a"/><rect x="150" y="210" width="100" height="25" fill="%23ffffff" rx="4"/><text x="200" y="227" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">TYY-7F10</text><text x="200" y="50" fill="%23ffffff" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">FRENTE DO VEÍCULO</text></svg>`;

const sampleCarRear = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M70 200 L90 140 L140 100 L260 100 L310 140 L330 200 Z" fill="%230284c7"/><rect x="80" y="190" width="240" height="50" rx="8" fill="%2364748b"/><circle cx="110" cy="190" r="15" fill="%23ef4444"/><circle cx="290" cy="190" r="15" fill="%23ef4444"/><rect x="150" y="210" width="100" height="25" fill="%23ffffff" rx="4"/><text x="200" y="227" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">TYY-7F10</text><text x="200" y="50" fill="%23ffffff" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">TRASEIRA DO VEÍCULO</text></svg>`;

const sampleCarLeft = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M40 210 L60 170 L110 120 L270 120 L330 170 L360 210 Z" fill="%230ea5e9"/><circle cx="100" cy="220" r="28" fill="%230f172a" stroke="%2394a3b8" stroke-width="6"/><circle cx="290" cy="220" r="28" fill="%230f172a" stroke="%2394a3b8" stroke-width="6"/><text x="200" y="50" fill="%23ffffff" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">LATERAL ESQUERDA</text></svg>`;

const sampleCarRight = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M40 210 L60 170 L110 120 L270 120 L330 170 L360 210 Z" fill="%230ea5e9"/><circle cx="100" cy="220" r="28" fill="%230f172a" stroke="%2394a3b8" stroke-width="6"/><circle cx="290" cy="220" r="28" fill="%230f172a" stroke="%2394a3b8" stroke-width="6"/><text x="200" y="50" fill="%23ffffff" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">LATERAL DIREITA</text></svg>`;

export const INITIAL_FLEET_UPDATES: VehicleMonthlyUpdate[] = [
  {
    id: 'amv_1',
    code: 'AMV-2026-001',
    farm: 'Vale das Uvas',
    plate: 'TYY7F10',
    vehicleModel: 'ARGO',
    mileage: 42850,
    driver: 'Ronaldo Alves',
    date: '2026-11-01',
    time: '08:30',
    preventiveMaintenanceLast30Days: true,
    preventiveMaintenanceNotes: 'Troca de óleo do motor 5W30, filtro de óleo, filtro de combustível e filtro de ar do motor.',
    hasIncidentLast30Days: false,
    incidentNotes: '',
    visualInspection: {
      front: sampleCarFront,
      rear: sampleCarRear,
      leftSide: sampleCarLeft,
      rightSide: sampleCarRight
    },
    notes: 'Veículo em excelente estado operacional. Nível de água e pneus devidamente calibrados.',
    createdAt: '2026-11-01T08:30:00.000Z'
  },
  {
    id: 'amv_2',
    code: 'AMV-2026-002',
    farm: 'Brasil Uvas',
    plate: 'UBQ7F95',
    vehicleModel: 'POLO MAN',
    mileage: 28310,
    driver: 'Marcos Vinícius',
    date: '2026-11-03',
    time: '09:15',
    preventiveMaintenanceLast30Days: false,
    preventiveMaintenanceNotes: '',
    hasIncidentLast30Days: true,
    incidentNotes: 'Pequeno arranhão superficial no para-choque traseiro direito ao manobrar no pátio interno do galpão.',
    visualInspection: {
      front: sampleCarFront,
      rear: sampleCarRear,
      leftSide: sampleCarLeft,
      rightSide: sampleCarRight
    },
    notes: 'Aguardando avaliação da gerência para polimento/retoque de pintura. Parte mecânica 100% em ordem.',
    createdAt: '2026-11-03T09:15:00.000Z'
  }
];

