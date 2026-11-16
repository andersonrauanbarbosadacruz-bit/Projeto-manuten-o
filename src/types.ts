export type Farm = 'Vale das Uvas' | 'Brasil Uvas' | 'Labrunier 1' | 'Labrunier 2' | 'Matriz' | 'Bravis';

export const FARMS: Farm[] = [
  'Vale das Uvas',
  'Brasil Uvas',
  'Labrunier 1',
  'Labrunier 2',
  'Matriz',
  'Bravis'
];

export type ChecklistType = 'SALA_DE_MAQUINAS' | 'GERADOR' | 'IRRIGACAO' | 'DRONE' | 'VEICULO';

export const CHECKLIST_TYPE_LABELS: Record<ChecklistType, string> = {
  SALA_DE_MAQUINAS: 'Sala de Máquinas',
  GERADOR: 'Grupo Gerador',
  IRRIGACAO: 'Irrigação',
  DRONE: 'Drone Agrícola',
  VEICULO: 'Veículo / Frota'
};

export type ComplianceStatus = 'C' | 'N/C' | 'N/A' | null;

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  farm?: Farm;
}

export interface DroneAsset {
  id: string;
  name: string;   // ex: "Drone 01"
  model: string;  // ex: "DJI T70P"
  label: string;  // ex: "Drone 01 (DJI T70P)"
  farm?: Farm;
  createdAt?: string;
}

export interface VehicleVisualInspection {
  front?: string;      // Foto Frente
  rear?: string;       // Foto Traseira
  leftSide?: string;   // Foto Lateral Esquerda
  rightSide?: string;  // Foto Lateral Direita
}

export interface ChecklistItemTemplate {
  id: string;
  description: string;
  requiresImage: boolean;
  category?: string;
}

export interface ChecklistItemResponse {
  itemId: string;
  description: string;
  status: ComplianceStatus;
  requiresImage: boolean;
  photoUrl?: string;
  notes?: string;
  generatedWorkOrderId?: string;
  // Reconhecimento / Aceite Administrativo de Não Conformidade (Admin)
  adminAcknowledged?: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgementJustification?: string;
}

export interface ChecklistRecord {
  id: string;
  code: string;
  type: ChecklistType;
  farm: Farm;
  location: string;
  date: string;
  time: string;
  inspector: string; // Operador ou Condutor
  shift?: string;
  // Specific Drone fields
  droneModel?: string;
  // Specific Vehicle fields
  vehiclePlate?: string;
  vehicleModel?: string;
  initialKm?: number | string;
  finalKm?: number | string;
  vehicleVisual?: VehicleVisualInspection;
  signatureUrl?: string; // Assinatura digital na tela do condutor/responsável
  items: ChecklistItemResponse[];
  generalNotes?: string;
  statusSummary: 'CONFORME' | 'COM_PENDENCIAS' | 'CRITICO' | 'EM_ANDAMENTO';
  workOrderIds?: string[];
  createdAt: string;
  isDraft?: boolean;
}

export type WorkOrderStatus = 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'RASCUNHO';

export type WorkOrderPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type MaintenanceType = 'PREVENTIVA' | 'CORRETIVA';

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface WorkOrderPhoto {
  id: string;
  url: string;
  caption?: string;
  timestamp: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  farm: Farm;
  equipment: string; // Equipamento que sofrerá manutenção
  maintenanceType: MaintenanceType; // Preventiva ou Corretiva
  date: string;
  time: string;
  location: string;
  responsible: string;
  thirdParty: string; // Empresa ou técnico terceiro envolvido, ou "Não / Equipe Interna"
  isThirdParty: boolean;
  problemDescription: string;
  materials: MaterialItem[];
  photosBefore: WorkOrderPhoto[];
  photosAfter: WorkOrderPhoto[];
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  solutionDescription?: string;
  completionDate?: string;
  completionTime?: string;
  checklistSourceId?: string;
  checklistItemDescription?: string;
  serviceRequestId?: string;
  serviceRequestCode?: string;
  requesterName?: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceRequestStatus = 'PENDENTE' | 'EM_ATENDIMENTO' | 'OS_GERADA' | 'CONCLUIDA' | 'CANCELADA';

export interface ServiceRequest {
  id: string;
  code: string; // Ex: SS-2026-001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  requesterName: string;
  requesterSector?: string;
  farm: Farm;
  location: string;
  equipment: string;
  problemDescription: string;
  urgency?: 'NORMAL' | 'URGENTE';
  priorityValidated?: boolean;
  priorityValidatedAt?: string;
  priorityValidatedBy?: string;
  photos?: string[];
  status: ServiceRequestStatus;
  linkedWorkOrderId?: string;
  linkedWorkOrderCode?: string;
  assignedOperatorName?: string;
  linkedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OperatorServiceRelease {
  id: string;
  token: string; // Chave exclusiva gerada para o operador autorizado
  operatorName: string; // Nome / Identificação do técnico ou operador
  farm: Farm | 'TODAS';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface VehicleMonthlyUpdate {
  id: string;
  code: string; // Ex: AMV-2026-001
  farm: Farm;
  mileage: number | string;
  driver: string;
  date: string;
  time: string;
  plate: string;
  vehicleModel?: string;
  preventiveMaintenanceLast30Days: boolean;
  preventiveMaintenanceNotes?: string;
  hasIncidentLast30Days: boolean;
  incidentNotes?: string;
  incidentPhotos?: string[];
  visualInspection: VehicleVisualInspection;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  // Reconhecimento / Aceite Administrativo de Sinistro (Admin / Gerente Manutenção)
  adminAcknowledged?: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgementJustification?: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'checklists' 
  | 'new-checklist' 
  | 'work-orders' 
  | 'new-work-order' 
  | 'fleet-updates' 
  | 'new-fleet-update'
  | 'service-requests'
  | 'new-service-request'
  | 'nr13-calibrations';

export type UserRole = 'ADMIN' | 'OPERADOR' | 'SOLICITANTE';

export type AccessModule = 'service_request' | 'fleet_update' | 'checklist' | 'work_order';

export const ALL_ACCESS_MODULES: AccessModule[] = [
  'service_request',
  'fleet_update',
  'checklist',
  'work_order'
];

// ==================== LAUDOS & CALIBRAÇÕES (NR-13 & METROLOGIA) ====================

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string; // Base64 data URL for PDF or image
  uploadedAt: string;
  tag?: string; // ex: 'ART', 'LAUDO_VALVULA', 'LAUDO_ULTRASSOM', 'CERTIFICADO_CALIBRACAO'
}

export interface NR13UltrassomPoint {
  pointId: string;       // P-01, P-02, P-03...
  location: string;      // ex: 'Tampo Superior', 'Costado - Anel 1', 'Costado - Anel 2', 'Tampo Inferior'
  measuredThickness: number; // mm
  minAllowedThickness: number; // mm
  status: 'CONFORME' | 'NAO_CONFORME';
  observation?: string;
}

export interface NR13ScopeItem {
  activity: string;
  performed: 'SIM' | 'NAO' | 'NA';
  methodObservation: string;
}

export type NR13InspectionNature = 'INICIAL' | 'PERIODICA' | 'EXTRAORDINARIA';
export type NR13Opinion = 'FAVORAVEL' | 'FAVORAVEL_COM_RESTRICOES' | 'DESFAVORAVEL' | 'INCONCLUSIVO';
export type NR13Category = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface NR13CompanyData {
  razaoSocial: string;
  cnpj: string;
  address: string;
  cityState: string;
  cep: string;
}

export interface NR13UltrassomMatrix {
  body: [string, string, string, string];      // P1, P2, P3, P4
  leftHead: [string, string, string, string];  // B1, B2, B3, B4 (Tampo Esquerdo)
  rightHead: [string, string, string, string]; // B1, B2, B3, B4 (Tampo Direito)
}

export interface NR13VesselChecklist {
  visualInspection: string;
  thicknessMeasurement: string;
  safetyValveCalibration: string;
  leakage: string;
  stickerInstallation: string;
  factoryInfoSticker: string;
  easyAccess: string;
  confinedSpace: string;
  emergencyLighting: string;
  operatesNormally: string;
  meetsAllNR13: string;
  matchesDossier: string;
  anomalyFound: string;
  hasPressureGauge: string;
  hasSafetyValve: string;
  identificationNumber: string;
}

export interface NR13SafetyValveTechnical {
  tag?: string;
  manufacturer?: string;
  model?: string;
  connectionSize?: string;
  fluidType?: string;
  setPressure?: string;
  openingPressure?: string;
  reseatPressure?: string;
  certificateNumber?: string;
  calibrationDate?: string;
  nextCalibrationDate?: string;
  visualInspection?: string;
  calibrationStatus?: string;
  leakage?: string;
}

export interface NR13PressureGaugeTechnical {
  tag?: string;
  manufacturer?: string;
  model?: string;
  scaleRange?: string;
  accuracyClass?: string;
  certificateNumber?: string;
  calibrationDate?: string;
  nextCalibrationDate?: string;
}

export interface NR13DocumentationCheck {
  completeAndUpToDate: string;
  withinLegalDeadline: string;
  dossierProntuario: string;
  drawingDesenho: string;
  occurrenceBook: string;
  startupShutdownProcedure: string;
  emergencyProcedure: string;
}

export interface NR13InspectionReport {
  id: string;
  code: string; // RT-XXX/AAAA (ex: RT-001/2026)
  vesselNumber?: string; // ex: "Vaso 01", "VP-01"
  equipmentTag: string; // ex: VP-01 - Reservatório de Ar Comprimido
  equipmentDescription?: string;
  farm: Farm;
  sector: string; // Local de instalação (ex: Sala de Máquinas, Packing House, Oficina)
  inspectionNature: NR13InspectionNature;
  inspectionDate: string;      // Data de início da inspeção
  inspectionEndDate?: string;  // Data de término da inspeção
  issueDate: string;
  technicalResponsible: string; // Nome do Profissional Habilitado (PH)
  creaNumber: string; // ex: CREA-PE 12345/D
  artNumber: string; // Número da ART
  equipmentPhoto?: string; // Foto principal da capa (IMAGEM DO EQUIPAMENTO)

  // 2. Dados da Empresa
  companyData?: NR13CompanyData;

  // 1. Finalidade e Escopo
  scope: {
    externalVisual: { performed: boolean; note: string };
    internalVisual: { performed: boolean | 'NA'; note: string };
    ultrassom: { performed: boolean; note: string };
    safetyDevices: { performed: boolean; note: string };
    documentAnalysis: { performed: boolean; note: string };
  };

  // 2. Identificação das Partes
  parties: {
    owner: string; // Razão social, CNPJ, unidade (ex: el Ciruelo Agrícola)
    contractor: string;
    inspectionCompany: string;
    responsibleSpecialty: string;
    inspectionCompanion: string; // Nome e função na fazenda
  };

  // 3. Dados Técnicos do Vaso (Caracterização do Equipamento)
  equipment: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    manufactureYear: string | number;
    projectCode: string; // Norma do projeto (ex: ASME VIII Div. 1)
    designCodeEdition?: string; // Edição da norma
    geometricVolume: number; // em Litros ou m³
    volumeUnit: 'L' | 'm³';
    serviceFluid: string; // ex: Ar Comprimido, Amônia (NH3), Vapor
    fluidGroup: string; // Grupo 1 (tóxico/inflamável) ou Grupo 2
    pmta: number; // Pressão Máxima de Trabalho Admissível (kgf/cm² ou bar)
    pth?: string | number; // Pressão de Teste Hidrostático (PTH)
    normalOperatingPressure: number; // Pressão normal / máxima de operação
    maxOperatingPressure?: string | number;
    equipmentType?: string; // Tipo Equipamento
    vesselPurpose?: string; // Finalidade do vaso
    vesselType?: string; // Tipo de Vaso
    outerDiameter?: string; // Diâmetro Externo
    length?: string; // Comprimento
    tareWeight?: string; // Tara
    bodyThickness?: string; // Espessura do Corpo
    headThickness?: string; // Espessura da Calota
    headBottomLeft?: string; // Calota (Inferior Esquerdo)
    headTopRight?: string; // Calota (Superior Direito)
    height?: string; // Altura
    width?: string; // Largura
    minBodyThickness?: string; // Espessura Mínima Corpo
    minHeadThickness?: string; // Espessura Mínima Calota
    local?: string; // Local
    area?: string; // Área
    designTemperature: string; // Temperatura de Projeto (°C)
    operatingTemperature?: string; // Temperatura de Trabalho (°C)
    material: string; // ex: Aço Carbono ASTM A-36
    mainDimensions: string; // ex: Ø 800mm x 2000mm
    installationConfig: 'HORIZONTAL' | 'VERTICAL';
  };

  // 4. Enquadramento e Categorização NR-13
  nr13Categorization: {
    fluidClass: 'A' | 'B' | 'C' | 'D';
    pressureMpa: number;
    volumeM3: number;
    pvProduct: number;
    category: NR13Category;
    riskGroup?: string; // Grupo potencial de risco
  };

  // 5. Tipo e Descrição das Inspeções Realizadas no Vaso
  vesselChecklist?: NR13VesselChecklist;

  // 6. Verificação dos Dispositivos e Acessórios
  devicesVerification: {
    safetyValveCondition: 'CONFORME' | 'NAO_CONFORME' | 'NA';
    safetyValveNotes: string;
    pressureGaugeCondition: 'CONFORME' | 'NAO_CONFORME' | 'NA';
    pressureGaugeNotes: string;
    drainsAndVentsCondition: 'CONFORME' | 'NAO_CONFORME' | 'NA';
    drainsAndVentsNotes: string;
    nameplateCondition: 'CONFORME' | 'NAO_CONFORME' | 'NA';
    nameplateNotes: string;
  };

  // 6 & 9. Medições de Espessura por Ultrassom
  ultrassomPerformed?: 'SIM' | 'NAO' | '';
  ultrassomPoints: NR13UltrassomPoint[];
  ultrassomMatrix?: NR13UltrassomMatrix; // Corpo P1-P4, Tampo Esquerdo B1-B4, Tampo Direito B1-B4
  ultrassomEquipmentUsed?: string; // Fabricante/modelo do medidor de espessura

  // 7 & 8. Dados Técnicos e Inspeções da Válvula + Manômetro vinculado
  safetyValveTechnical?: NR13SafetyValveTechnical;
  pressureGaugeTechnical?: NR13PressureGaugeTechnical;

  // 9. Verificação de Documentação (Item 13.5.3.1 NR-13)
  documentationCheck?: NR13DocumentationCheck;

  // 10. Não conformidades e recomendações
  nonConformities: Array<{
    id: string;
    evidence: string;
    recommendedAction: string;
    deadline?: string;
  }>;
  recommendations?: string;

  // 11 & 12. Parecer Técnico e Conclusão
  technicalOpinion: NR13Opinion;
  operationalRestrictionsNotes?: string;
  conclusionCheck?: {
    conforme: boolean;
    naoConforme: boolean;
    releasedWithRestrictions: boolean;
  };

  // 13. Próximas Inspeções
  nextInspections: {
    nextExternalInspectionDate: string;
    nextInternalInspectionDate: string;
    nextComplementaryTestDate?: string;
  };

  // 14, 15, 16. ANEXOS RASTREÁVEIS SEPARADOS
  artAttachment?: DocumentAttachment;                 // Campo para anexar a ART
  valveCalibrationAttachment?: DocumentAttachment;    // Campo para anexar Laudo Calibrador de Válvula
  ultrassomAttachment?: DocumentAttachment;           // Campo para anexar Laudo Ultrassom

  // Fotos do vaso / registro fotográfico da inspeção
  photos?: string[];

  createdAt: string;
  updatedAt?: string;
}

export interface NR13VesselMaster {
  id: string;
  farm: Farm;
  assetType?: 'VP' | 'CP'; // VP = Vaso de Pressão, CP = Compressor
  vesselNumber: string; // ex: "VP-01", "CP-01"
  equipmentTag: string; // ex: "VP-01 - Reservatório de Ar Comprimido"
  sector: string;
  companyData: NR13CompanyData;
  equipment: NR13InspectionReport['equipment'];
  nr13Categorization: NR13InspectionReport['nr13Categorization'];
  linkedValveTag?: string;
  linkedValveSpecs?: NR13SafetyValveTechnical;
  linkedGaugeTag?: string;
  linkedGaugeSpecs?: NR13PressureGaugeTechnical;
  defaultUltrassomMatrix?: NR13UltrassomMatrix;
  equipmentPhoto?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ValveCalibrationRecord {
  id: string;
  code: string; // CAL-VALV-2026-001
  tag: string; // ex: PSV-01, PSV-NH3-02
  farm: Farm;
  equipmentLinked: string; // ex: Vaso de Pressão VP-01, Compressor de Ar CP-02
  sector: string; // ex: Sala de Máquinas, Packing House
  manufacturer: string;
  model: string;
  connectionSize: string; // ex: 1/2" NPT, 1" Flange 150#
  fluidType: string; // Ar Comprimido, Amônia, Vapor, Água
  setPressure: number; // Pressão de ajuste de projeto (bar ou kgf/cm²)
  openingPressure: number; // Pressão de abertura medida no teste (Pop test)
  reseatPressure?: number; // Pressão de fechamento (Blowdown)
  pressureUnit: 'bar' | 'kgf/cm²' | 'psi';
  tightnessTest: 'SEM_VAZAMENTO' | 'COM_VAZAMENTO';
  testFluid: string; // ex: Ar Comprimido Seco, Nitrogênio, Água
  testBenchStandard: string; // Manômetro Padrão / Bancada de Teste utilizada
  standardCertNumber: string; // Nº do certificado de calibração do padrão rastreável
  technicianName: string;
  calibrationDate: string;
  nextCalibrationDate: string; // Próxima calibração recomendada (NR-13)
  status: 'APROVADA' | 'REPROVADA' | 'AJUSTADA';
  notes?: string;
  certificateAttachment?: DocumentAttachment; // Certificado de Calibração da Válvula
  createdAt: string;
  updatedAt?: string;
}

export interface GaugeCalibrationPoint {
  nominalValue: number;
  risingValue: number;  // Leitura na Subida
  fallingValue: number; // Leitura na Descida
  error: number;        // Erro Máximo
}

export interface GaugeCalibrationRecord {
  id: string;
  code: string; // CAL-MAN-2026-001
  tag: string; // ex: MAN-01, MAN-VP-02
  farm: Farm;
  equipmentLinked: string; // ex: Vaso de Pressão VP-01, Linha de Descarga Amônia
  sector: string;
  manufacturer: string;
  model?: string;
  gaugeType: 'ANALOGICO' | 'DIGITAL';
  scaleMin: number; // ex: 0
  scaleMax: number; // ex: 16
  unit: 'bar' | 'kgf/cm²' | 'psi';
  resolution: number; // ex: 0.2 bar
  accuracyClass: string; // ex: Classe B (±2.0%), Classe A (±1.0%), Classe 1.6%
  standardUsed: string; // Manômetro Digital Padrão Fluke 700G08 rastreável RBC
  standardCertNumber: string; // Nº Certificado do Padrão
  calibrationDate: string;
  nextCalibrationDate: string;
  calibratedBy: string;
  maxFoundError: number;
  maxAllowedError: number;
  testPoints?: GaugeCalibrationPoint[];
  status: 'APROVADO' | 'REPROVADO' | 'AJUSTADO';
  notes?: string;
  certificateAttachment?: DocumentAttachment;
  createdAt: string;
  updatedAt?: string;
}

export interface UltrassomEquipmentRecord {
  id: string;
  name: string;
  serialNumber: string;
  certificateNumber: string;
  calibrationDate: string;
  nextCalibrationDate: string;
  calibrationLab?: string;
  measurementRange?: string;
  resolution?: string;
  uncertainty?: string;
  status: 'CALIBRADO' | 'VENCIDO' | 'MANUTENCAO';
  notes?: string;
  certificateAttachment?: DocumentAttachment;
  createdAt: string;
  updatedAt?: string;
}


