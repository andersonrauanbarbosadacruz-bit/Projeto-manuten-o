import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Paperclip, 
  ShieldAlert, 
  Layers, 
  FileCheck, 
  Activity, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { 
  DocumentAttachment, 
  Farm, 
  FARMS, 
  NR13Category, 
  NR13InspectionNature, 
  NR13InspectionReport, 
  NR13Opinion, 
  NR13UltrassomPoint 
} from '../../types';
import { AttachmentUploadField } from './AttachmentUploadField';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface NR13ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: Partial<NR13InspectionReport>) => void;
  initialData?: NR13InspectionReport | null;
  defaultFarm?: Farm | 'TODAS';
}

export const NR13ReportModal: React.FC<NR13ReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultFarm
}) => {
  if (!isOpen) return null;

  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedPreviewAttachment, setSelectedPreviewAttachment] = useState<DocumentAttachment | null>(null);

  // Form State
  const [code, setCode] = useState(initialData?.code || `RT-00${Math.floor(Math.random() * 90 + 10)}/2026`);
  const [equipmentTag, setEquipmentTag] = useState(initialData?.equipmentTag || '');
  const [equipmentDescription, setEquipmentDescription] = useState(initialData?.equipmentDescription || '');
  const [farm, setFarm] = useState<Farm>(
    initialData?.farm || (defaultFarm && defaultFarm !== 'TODAS' ? defaultFarm : 'Vale das Uvas')
  );
  const [sector, setSector] = useState(initialData?.sector || 'Sala de Máquinas & Compressores');
  const [inspectionNature, setInspectionNature] = useState<NR13InspectionNature>(initialData?.inspectionNature || 'PERIODICA');
  const [inspectionDate, setInspectionDate] = useState(initialData?.inspectionDate || new Date().toISOString().substring(0, 10));
  const [issueDate, setIssueDate] = useState(initialData?.issueDate || new Date().toISOString().substring(0, 10));
  const [technicalResponsible, setTechnicalResponsible] = useState(initialData?.technicalResponsible || 'Eng. Carlos Eduardo Mendes');
  const [creaNumber, setCreaNumber] = useState(initialData?.creaNumber || 'CREA-PE 12345-D');
  const [artNumber, setArtNumber] = useState(initialData?.artNumber || '');

  // Parties
  const [owner, setOwner] = useState(initialData?.parties?.owner || 'el Ciruelo Agrícola do Brasil Ltda');
  const [contractor, setContractor] = useState(initialData?.parties?.contractor || 'el Ciruelo - Gerência de Manutenção');
  const [inspectionCompany, setInspectionCompany] = useState(initialData?.parties?.inspectionCompany || 'Inspetec Engenharia NR-13 Ltda');
  const [inspectionCompanion, setInspectionCompanion] = useState(initialData?.parties?.inspectionCompanion || 'Supervisor de Manutenção');

  // Equipment Specs
  const [manufacturer, setManufacturer] = useState(initialData?.equipment?.manufacturer || 'Schulz S.A.');
  const [model, setModel] = useState(initialData?.equipment?.model || '');
  const [serialNumber, setSerialNumber] = useState(initialData?.equipment?.serialNumber || '');
  const [manufactureYear, setManufactureYear] = useState<string | number>(initialData?.equipment?.manufactureYear || '2020');
  const [projectCode, setProjectCode] = useState(initialData?.equipment?.projectCode || 'ASME VIII Div. 1');
  const [geometricVolume, setGeometricVolume] = useState<number>(initialData?.equipment?.geometricVolume || 400);
  const [volumeUnit, setVolumeUnit] = useState<'L' | 'm³'>(initialData?.equipment?.volumeUnit || 'L');
  const [serviceFluid, setServiceFluid] = useState(initialData?.equipment?.serviceFluid || 'Ar Comprimido');
  const [fluidGroup, setFluidGroup] = useState(initialData?.equipment?.fluidGroup || 'Grupo 2');
  const [pmta, setPmta] = useState<number>(initialData?.equipment?.pmta || 10.5);
  const [normalOperatingPressure, setNormalOperatingPressure] = useState<number>(initialData?.equipment?.normalOperatingPressure || 8.5);
  const [material, setMaterial] = useState(initialData?.equipment?.material || 'Aço Carbono ASTM A-414');
  const [dimensions, setDimensions] = useState(initialData?.equipment?.mainDimensions || 'Ø 600 mm x 1750 mm');
  const [installationConfig, setInstallationConfig] = useState<'HORIZONTAL' | 'VERTICAL'>(
    initialData?.equipment?.installationConfig || 'VERTICAL'
  );

  // NR-13 Categorization
  const [fluidClass, setFluidClass] = useState<'A' | 'B' | 'C' | 'D'>(initialData?.nr13Categorization?.fluidClass || 'C');
  const [category, setCategory] = useState<NR13Category>(initialData?.nr13Categorization?.category || 'IV');

  // Scope & Devices
  const [externalVisual, setExternalVisual] = useState(initialData?.scope?.externalVisual?.performed ?? true);
  const [internalVisual, setInternalVisual] = useState<boolean | 'NA'>(initialData?.scope?.internalVisual?.performed ?? true);
  const [safetyValveCondition, setSafetyValveCondition] = useState<'CONFORME' | 'NAO_CONFORME' | 'NA'>(
    initialData?.devicesVerification?.safetyValveCondition || 'CONFORME'
  );
  const [safetyValveNotes, setSafetyValveNotes] = useState(
    initialData?.devicesVerification?.safetyValveNotes || 'Válvula calibrada com lacre intacto.'
  );
  const [pressureGaugeCondition, setPressureGaugeCondition] = useState<'CONFORME' | 'NAO_CONFORME' | 'NA'>(
    initialData?.devicesVerification?.pressureGaugeCondition || 'CONFORME'
  );
  const [pressureGaugeNotes, setPressureGaugeNotes] = useState(
    initialData?.devicesVerification?.pressureGaugeNotes || 'Manômetro aferido e com ponteiro em repouso no zero.'
  );

  // Ultrassom Points
  const [ultrassomPoints, setUltrassomPoints] = useState<NR13UltrassomPoint[]>(
    initialData?.ultrassomPoints || [
      { pointId: 'P-01', location: 'Tampo Superior', measuredThickness: 6.35, minAllowedThickness: 4.80, status: 'CONFORME', observation: 'Sem corrosão' },
      { pointId: 'P-02', location: 'Costado Superior', measuredThickness: 6.20, minAllowedThickness: 4.50, status: 'CONFORME', observation: 'Dentro do limite' },
      { pointId: 'P-03', location: 'Costado Inferior', measuredThickness: 6.15, minAllowedThickness: 4.50, status: 'CONFORME', observation: 'Espessura estável' },
      { pointId: 'P-04', location: 'Tampo Inferior', measuredThickness: 6.40, minAllowedThickness: 4.80, status: 'CONFORME', observation: 'Região do dreno limpa' }
    ]
  );

  // =========================================================================
  // OS 3 CAMPOS DE ANEXOS SEPARADOS (REQUISITO EXPLÍCITO)
  // =========================================================================
  const [artAttachment, setArtAttachment] = useState<DocumentAttachment | undefined>(initialData?.artAttachment);
  const [valveCalibrationAttachment, setValveCalibrationAttachment] = useState<DocumentAttachment | undefined>(initialData?.valveCalibrationAttachment);
  const [ultrassomAttachment, setUltrassomAttachment] = useState<DocumentAttachment | undefined>(initialData?.ultrassomAttachment);

  // Opinion & Next Inspections
  const [technicalOpinion, setTechnicalOpinion] = useState<NR13Opinion>(initialData?.technicalOpinion || 'FAVORAVEL');
  const [restrictionsNotes, setRestrictionsNotes] = useState(
    initialData?.operationalRestrictionsNotes || 'Equipamento aprovado para operação contínua nas condições e pressões especificadas neste laudo.'
  );
  const [nextExternalDate, setNextExternalDate] = useState(
    initialData?.nextInspections?.nextExternalInspectionDate || 
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().substring(0, 10)
  );
  const [nextInternalDate, setNextInternalDate] = useState(
    initialData?.nextInspections?.nextInternalInspectionDate || 
    new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString().substring(0, 10)
  );

  const handleAddUltrassomPoint = () => {
    const nextNum = ultrassomPoints.length + 1;
    const newPt: NR13UltrassomPoint = {
      pointId: `P-0${nextNum}`,
      location: `Ponto ${nextNum}`,
      measuredThickness: 6.00,
      minAllowedThickness: 4.50,
      status: 'CONFORME',
      observation: ''
    };
    setUltrassomPoints([...ultrassomPoints, newPt]);
  };

  const handleRemoveUltrassomPoint = (index: number) => {
    setUltrassomPoints(ultrassomPoints.filter((_, i) => i !== index));
  };

  const handleUpdateUltrassomPoint = (index: number, field: keyof NR13UltrassomPoint, val: any) => {
    const updated = [...ultrassomPoints];
    updated[index] = { ...updated[index], [field]: val };
    
    // Auto calculate status if thickness changes
    if (field === 'measuredThickness' || field === 'minAllowedThickness') {
      const measured = field === 'measuredThickness' ? Number(val) : updated[index].measuredThickness;
      const min = field === 'minAllowedThickness' ? Number(val) : updated[index].minAllowedThickness;
      updated[index].status = measured >= min ? 'CONFORME' : 'NAO_CONFORME';
    }

    setUltrassomPoints(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentTag.trim()) {
      alert('Por favor, informe a identificação/TAG do vaso de pressão.');
      setActiveStep(1);
      return;
    }

    const volumeM3 = volumeUnit === 'L' ? geometricVolume / 1000 : geometricVolume;
    const pressureMpa = (pmta * 0.0980665); // kgf/cm² to MPa
    const pvProduct = parseFloat((pressureMpa * volumeM3).toFixed(2));

    const reportData: Partial<NR13InspectionReport> = {
      ...(initialData || {}),
      code,
      equipmentTag,
      equipmentDescription,
      farm,
      sector,
      inspectionNature,
      inspectionDate,
      issueDate,
      technicalResponsible,
      creaNumber,
      artNumber,
      parties: {
        owner,
        contractor,
        inspectionCompany,
        responsibleSpecialty: 'Engenharia Mecânica e Segurança',
        inspectionCompanion
      },
      equipment: {
        manufacturer,
        model,
        serialNumber,
        manufactureYear,
        projectCode,
        geometricVolume,
        volumeUnit,
        serviceFluid,
        fluidGroup,
        pmta,
        normalOperatingPressure,
        designTemperature: '50',
        material,
        mainDimensions: dimensions,
        installationConfig
      },
      nr13Categorization: {
        fluidClass,
        pressureMpa: parseFloat(pressureMpa.toFixed(2)),
        volumeM3: parseFloat(volumeM3.toFixed(3)),
        pvProduct,
        category
      },
      scope: {
        externalVisual: { performed: externalVisual, note: 'Inspeção visual externa completa' },
        internalVisual: { performed: internalVisual, note: 'Inspeção visual interna' },
        ultrassom: { performed: ultrassomPoints.length > 0, note: `${ultrassomPoints.length} pontos medidos` },
        safetyDevices: { performed: true, note: 'Válvula e manômetro testados' },
        documentAnalysis: { performed: true, note: 'Prontuário verificado' }
      },
      devicesVerification: {
        safetyValveCondition,
        safetyValveNotes,
        pressureGaugeCondition,
        pressureGaugeNotes,
        drainsAndVentsCondition: 'CONFORME',
        drainsAndVentsNotes: 'Dreno de purga em funcionamento',
        nameplateCondition: 'CONFORME',
        nameplateNotes: 'Placa legível'
      },
      ultrassomPoints,
      technicalOpinion,
      operationalRestrictionsNotes: restrictionsNotes,
      nextInspections: {
        nextExternalInspectionDate: nextExternalDate,
        nextInternalInspectionDate: nextInternalDate
      },
      // Os 3 anexos separados
      artAttachment,
      valveCalibrationAttachment,
      ultrassomAttachment
    };

    onSave(reportData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[95vh] overflow-hidden border border-slate-300">
        
        {/* Header with El Ciruelo Branding */}
        <div className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <img 
              src="/assets/aistudio/image_adab39d7.png" 
              alt="el Ciruelo" 
              className="h-8 w-auto object-contain bg-white/10 px-2 py-0.5 rounded-md" 
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-fuchsia-200 text-fuchsia-950 uppercase tracking-wider">
                  NR-13 • Vaso de Pressão
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {code}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {initialData ? 'Editar Laudo Técnico NR-13' : 'Novo Relatório Técnico de Inspeção NR-13'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-1.5 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeStep === 1
                ? 'bg-fuchsia-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            1. Identificação & Partes
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeStep === 2
                ? 'bg-fuchsia-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            2. Vaso & Categoria NR-13
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeStep === 3
                ? 'bg-fuchsia-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            3. Ultrassom & Acessórios
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
              activeStep === 4
                ? 'bg-fuchsia-900 text-white shadow-xs'
                : 'text-fuchsia-950 bg-fuchsia-100/60 hover:bg-fuchsia-100'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>4. Anexos (ART, Válvula, US)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(5)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeStep === 5
                ? 'bg-fuchsia-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            5. Parecer & Prazos
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* STEP 1: IDENTIFICAÇÃO & PARTES */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Identificação do Equipamento & Norma
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Código do Relatório *
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden font-mono"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      TAG / Identificação do Vaso *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: VP-01 - Reservatório de Ar Comprimido Schulz"
                      value={equipmentTag}
                      onChange={(e) => setEquipmentTag(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Fazenda el Ciruelo *
                    </label>
                    <select
                      value={farm}
                      onChange={(e) => setFarm(e.target.value as Farm)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden bg-white"
                    >
                      {FARMS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Setor / Local de Instalação *
                    </label>
                    <input
                      type="text"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Natureza da Inspeção
                    </label>
                    <select
                      value={inspectionNature}
                      onChange={(e) => setInspectionNature(e.target.value as NR13InspectionNature)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden bg-white"
                    >
                      <option value="PERIODICA">Periódica</option>
                      <option value="INICIAL">Inicial</option>
                      <option value="EXTRAORDINARIA">Extraordinária</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Data da Inspeção
                    </label>
                    <input
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Número da ART *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: PE20260481234"
                      value={artNumber}
                      onChange={(e) => setArtNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Responsável Técnico & Partes */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Identificação das Partes & Profissional Habilitado (PH)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Responsável Técnico (PH) *
                    </label>
                    <input
                      type="text"
                      value={technicalResponsible}
                      onChange={(e) => setTechnicalResponsible(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Registro CREA/UF *
                    </label>
                    <input
                      type="text"
                      value={creaNumber}
                      onChange={(e) => setCreaNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Empresa Inspetora
                    </label>
                    <input
                      type="text"
                      value={inspectionCompany}
                      onChange={(e) => setInspectionCompany(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Acompanhante da Inspeção (el Ciruelo)
                    </label>
                    <input
                      type="text"
                      value={inspectionCompanion}
                      onChange={(e) => setInspectionCompanion(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VASO & CATEGORIA NR-13 */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Dados Construtivos do Equipamento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Fabricante
                    </label>
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nº de Série
                    </label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Ano de Fabricação
                    </label>
                    <input
                      type="text"
                      value={manufactureYear}
                      onChange={(e) => setManufactureYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Código de Projeto
                    </label>
                    <input
                      type="text"
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Configuração
                    </label>
                    <select
                      value={installationConfig}
                      onChange={(e) => setInstallationConfig(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="VERTICAL">Vertical</option>
                      <option value="HORIZONTAL">Horizontal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Volume Geométrico ({volumeUnit})
                    </label>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        step="0.01"
                        value={geometricVolume}
                        onChange={(e) => setGeometricVolume(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <select
                        value={volumeUnit}
                        onChange={(e) => setVolumeUnit(e.target.value as any)}
                        className="px-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="L">L</option>
                        <option value="m³">m³</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Fluido de Serviço
                    </label>
                    <input
                      type="text"
                      value={serviceFluid}
                      onChange={(e) => setServiceFluid(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      PMTA (kgf/cm² ou bar) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pmta}
                      onChange={(e) => setPmta(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-fuchsia-950"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Enquadramento NR-13 */}
              <div className="bg-fuchsia-50/70 p-4 rounded-xl border border-fuchsia-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fuchsia-950 mb-3">
                  4. Enquadramento e Categorização da NR-13
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Classe do Fluido (NR-13)
                    </label>
                    <select
                      value={fluidClass}
                      onChange={(e) => setFluidClass(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                    >
                      <option value="A">Classe A - Fluidos inflamáveis / tóxicos com limite de tolerância ≤ 20 ppm (ex: Amônia NH3)</option>
                      <option value="B">Classe B - Fluidos combustíveis / gases inflamáveis</option>
                      <option value="C">Classe C - Vapor de água, gases asfixiantes simples ou ar comprimido</option>
                      <option value="D">Classe D - Outros fluidos não enquadrados nas classes anteriores</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Categoria do Vaso de Pressão (NR-13)
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold text-fuchsia-900"
                    >
                      <option value="I">CATEGORIA I (Máximo Risco)</option>
                      <option value="II">CATEGORIA II (Alto Risco)</option>
                      <option value="III">CATEGORIA III (Médio Risco)</option>
                      <option value="IV">CATEGORIA IV (Risco Moderado - padrão ar comprimido industrial)</option>
                      <option value="V">CATEGORIA V (Baixo Risco)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ULTRASSOM & ACESSÓRIOS */}
          {activeStep === 3 && (
            <div className="space-y-4">
              {/* Dispositivos de segurança */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  6. Dispositivos de Segurança e Acessórios
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Válvula de Segurança (PSV)
                    </label>
                    <select
                      value={safetyValveCondition}
                      onChange={(e) => setSafetyValveCondition(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold mb-1"
                    >
                      <option value="CONFORME">CONFORME</option>
                      <option value="NAO_CONFORME">NÃO CONFORME</option>
                      <option value="NA">NÃO APLICÁVEL</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Observações da válvula PSV..."
                      value={safetyValveNotes}
                      onChange={(e) => setSafetyValveNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Manômetro de Pressão
                    </label>
                    <select
                      value={pressureGaugeCondition}
                      onChange={(e) => setPressureGaugeCondition(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold mb-1"
                    >
                      <option value="CONFORME">CONFORME</option>
                      <option value="NAO_CONFORME">NÃO CONFORME</option>
                      <option value="NA">NÃO APLICÁVEL</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Observações do manômetro..."
                      value={pressureGaugeNotes}
                      onChange={(e) => setPressureGaugeNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Ultrassom */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      9. Medição de Espessura por Ultrassom (Tabela de Pontos)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Adicione os pontos aferidos no costado e tampos para cálculo de integridade mecânica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddUltrassomPoint}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Ponto</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">Ponto</th>
                        <th className="p-2">Localização</th>
                        <th className="p-2 text-right">Medida (mm)</th>
                        <th className="p-2 text-right">Mínima (mm)</th>
                        <th className="p-2 text-center">Status</th>
                        <th className="p-2">Obs</th>
                        <th className="p-2 text-center w-10">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ultrassomPoints.map((pt, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2">
                            <input
                              type="text"
                              value={pt.pointId}
                              onChange={(e) => handleUpdateUltrassomPoint(idx, 'pointId', e.target.value)}
                              className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded-md font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={pt.location}
                              onChange={(e) => handleUpdateUltrassomPoint(idx, 'location', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={pt.measuredThickness}
                              onChange={(e) => handleUpdateUltrassomPoint(idx, 'measuredThickness', parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded-md text-right font-bold"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={pt.minAllowedThickness}
                              onChange={(e) => handleUpdateUltrassomPoint(idx, 'minAllowedThickness', parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded-md text-right"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pt.status === 'CONFORME' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {pt.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={pt.observation || ''}
                              onChange={(e) => handleUpdateUltrassomPoint(idx, 'observation', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md text-slate-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveUltrassomPoint(idx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                              title="Remover ponto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: OS 3 CAMPOS DE ANEXOS SEPARADOS (REQUISITO EXPLÍCITO) */}
          {/* ========================================================================= */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-fuchsia-900 via-slate-900 to-emerald-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-fuchsia-300" />
                    <span>Anexos Oficiais Rastreáveis (NR-13)</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Anexe os 3 documentos obrigatórios de forma separada. Suporta arquivos PDF, imagens e certificados.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white text-fuchsia-950 uppercase shrink-0">
                  🍇 el Ciruelo
                </span>
              </div>

              {/* 1. Anexo da ART */}
              <AttachmentUploadField
                label="1. Anexo da ART (Anotação de Responsabilidade Técnica)"
                tag="ART"
                description="Upload do arquivo digitalizado ou PDF da ART vinculada ao CREA com o número do laudo."
                attachment={artAttachment}
                onAttachmentChange={setArtAttachment}
                onViewAttachment={setSelectedPreviewAttachment}
                required={false}
              />

              {/* 2. Laudo Calibrador de Válvula */}
              <AttachmentUploadField
                label="2. Laudo Calibrador de Válvula de Segurança (PSV)"
                tag="LAUDO_VALVULA"
                description="Upload do certificado ou laudo emitido em bancada de calibração para a válvula de alívio e segurança."
                attachment={valveCalibrationAttachment}
                onAttachmentChange={setValveCalibrationAttachment}
                onViewAttachment={setSelectedPreviewAttachment}
                required={false}
              />

              {/* 3. Laudo Ultrassom */}
              <AttachmentUploadField
                label="3. Laudo de Medição de Espessura por Ultrassom"
                tag="LAUDO_ULTRASSOM"
                description="Upload do relatório de Ensaio Não Destrutivo (END) por ultrassom emitido por técnico qualificado."
                attachment={ultrassomAttachment}
                onAttachmentChange={setUltrassomAttachment}
                onViewAttachment={setSelectedPreviewAttachment}
                required={false}
              />
            </div>
          )}

          {/* STEP 5: PARECER & PRAZOS */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  12. Parecer Técnico Conclusivo do PH
                </h3>
                
                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Parecer Técnico *
                  </label>
                  <select
                    value={technicalOpinion}
                    onChange={(e) => setTechnicalOpinion(e.target.value as NR13Opinion)}
                    className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FAVORAVEL">FAVORÁVEL (Equipamento em plenas condições operacionais)</option>
                    <option value="FAVORAVEL_COM_RESTRICOES">FAVORÁVEL COM RESTRIÇÕES (Operação condicionada a ações de reparo)</option>
                    <option value="DESFAVORAVEL">DESFAVORÁVEL (Interdição recomendada / Não seguro)</option>
                    <option value="INCONCLUSIVO">INCONCLUSIVO (Necessita exames complementares)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Condições, Limites Operacionais e Recomendações
                  </label>
                  <textarea
                    rows={4}
                    value={restrictionsNotes}
                    onChange={(e) => setRestrictionsNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-fuchsia-800 focus:outline-hidden"
                    placeholder="Descreva as conclusões, recomendações de manutenção preventiva e condições de operação..."
                  />
                </div>
              </div>

              {/* Próximas Inspeções */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  13. Programação das Próximas Inspeções
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Data da Próxima Inspeção Externa
                    </label>
                    <input
                      type="date"
                      value={nextExternalDate}
                      onChange={(e) => setNextExternalDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Data da Próxima Inspeção Interna
                    </label>
                    <input
                      type="date"
                      value={nextInternalDate}
                      onChange={(e) => setNextInternalDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep((activeStep - 1) as any)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                >
                  Voltar
                </button>
              )}
              {activeStep < 5 && (
                <button
                  type="button"
                  onClick={() => setActiveStep((activeStep + 1) as any)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                >
                  Avançar →
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2 rounded-lg text-xs font-extrabold bg-fuchsia-900 hover:bg-fuchsia-800 text-white shadow-md cursor-pointer transition-all border border-fuchsia-500/30"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Laudo NR-13</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Attachment Preview Modal */}
      {selectedPreviewAttachment && (
        <AttachmentViewerModal
          attachment={selectedPreviewAttachment}
          onClose={() => setSelectedPreviewAttachment(null)}
        />
      )}
    </div>
  );
};
