import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Layers,
  Paperclip,
  Gauge,
  Building,
  Sparkles,
  ImagePlus,
  ClipboardCheck,
  Database
} from 'lucide-react';
import {
  DocumentAttachment,
  Farm,
  FARMS,
  NR13Category,
  NR13CompanyData,
  NR13DocumentationCheck,
  NR13InspectionNature,
  NR13InspectionReport,
  NR13Opinion,
  NR13SafetyValveTechnical,
  NR13UltrassomMatrix,
  NR13UltrassomPoint,
  NR13VesselChecklist,
  NR13VesselMaster
} from '../../types';
import { FARM_COMPANY_PROFILES, formatUltrassomEquipmentLabel } from '../../data/nr13InitialData';
import { useApp } from '../../context/AppContext';
import { compressImage } from '../../utils/imageCompressor';
import { AttachmentUploadField } from './AttachmentUploadField';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { UltrassomEquipmentModal } from './UltrassomEquipmentModal';

interface NR13ReportFormModalProps {
  report?: NR13InspectionReport | null;
  preselectedVessel?: NR13VesselMaster | null;
  onSave: (report: NR13InspectionReport) => void;
  onClose: () => void;
  currentFarmFilter?: Farm | 'TODAS';
  isDedicatedScreen?: boolean;
}

const EMPTY_VESSEL_CHECKLIST: NR13VesselChecklist = {
  visualInspection: '',
  thicknessMeasurement: '',
  safetyValveCalibration: '',
  leakage: '',
  stickerInstallation: '',
  factoryInfoSticker: '',
  easyAccess: '',
  confinedSpace: '',
  emergencyLighting: '',
  operatesNormally: '',
  meetsAllNR13: '',
  matchesDossier: '',
  anomalyFound: '',
  hasPressureGauge: '',
  hasSafetyValve: '',
  identificationNumber: ''
};

const EMPTY_DOC_CHECK: NR13DocumentationCheck = {
  completeAndUpToDate: '',
  withinLegalDeadline: '',
  dossierProntuario: '',
  drawingDesenho: '',
  occurrenceBook: '',
  startupShutdownProcedure: '',
  emergencyProcedure: ''
};

const EMPTY_MATRIX: NR13UltrassomMatrix = {
  body: ['', '', '', ''],
  leftHead: ['', '', '', ''],
  rightHead: ['', '', '', '']
};

const COMPLIANCE_VALUES = ['C', 'NC', 'NA'] as const;

const ComplianceDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const isLegacyValue = Boolean(value && !COMPLIANCE_VALUES.includes(value as any));
  const colorClasses =
    value === 'C'
      ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900 font-bold'
      : value === 'NC'
        ? 'border-red-400 bg-red-50/80 text-red-900 font-bold'
        : value === 'NA'
          ? 'border-slate-300 bg-slate-100 text-slate-700 font-semibold'
          : 'border-amber-300 bg-white text-slate-700';

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full text-xs p-1.5 rounded border transition-colors ${colorClasses}`}
    >
      <option value="">-- Selecione --</option>
      <option value="C">C — Conforme</option>
      <option value="NC">NC — Não Conforme</option>
      <option value="NA">NA — Não Aplicável</option>
      {isLegacyValue && <option value={value}>{value}</option>}
    </select>
  );
};

export const NR13ReportFormModal: React.FC<NR13ReportFormModalProps> = ({
  report,
  preselectedVessel,
  onSave,
  onClose,
  currentFarmFilter,
  isDedicatedScreen = false
}) => {
  const { nr13Vessels, valveCalibrations, ultrassomEquipments, saveUltrassomEquipment, saveNR13Vessel } = useApp();

  const [activeFormSection, setActiveFormSection] = useState<'geral' | 'equipamento' | 'inspecoes' | 'anexos' | 'parecer'>('geral');
  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);
  const [showNewUltrassomModal, setShowNewUltrassomModal] = useState(false);
  const [autoFillFeedback, setAutoFillFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const defaultFarm: Farm =
    report?.farm ||
    preselectedVessel?.farm ||
    (currentFarmFilter && currentFarmFilter !== 'TODAS' ? currentFarmFilter : 'Vale das Uvas');

  const [selectedVesselId, setSelectedVesselId] = useState<string>(() => preselectedVessel?.id || '');

  const buildInitialReport = (): NR13InspectionReport => {
    if (report) {
      const cloned: NR13InspectionReport = JSON.parse(JSON.stringify(report));
      const baseProfile = FARM_COMPANY_PROFILES[cloned.farm];
      return {
        ...cloned,
        companyData: cloned.companyData || { ...baseProfile, cnpj: '' },
        vesselChecklist: cloned.vesselChecklist || { ...EMPTY_VESSEL_CHECKLIST },
        documentationCheck: cloned.documentationCheck || { ...EMPTY_DOC_CHECK },
        ultrassomMatrix: cloned.ultrassomMatrix || { ...EMPTY_MATRIX },
        ultrassomPerformed:
          cloned.ultrassomPerformed !== undefined
            ? cloned.ultrassomPerformed
            : cloned.scope?.ultrassom?.performed
            ? 'SIM'
            : '',
        conclusionCheck: cloned.conclusionCheck || {
          conforme: cloned.technicalOpinion === 'FAVORAVEL',
          naoConforme: cloned.technicalOpinion === 'DESFAVORAVEL',
          releasedWithRestrictions: cloned.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
        }
      };
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const year = new Date().getFullYear();
    const randNum = Math.floor(100 + Math.random() * 900);
    const farmProfile = FARM_COMPANY_PROFILES[defaultFarm];

    return {
      id: `nr13_${Date.now()}`,
      code: `RT-${randNum}/${year}`,
      vesselNumber: '',
      equipmentTag: '',
      equipmentDescription: '',
      farm: defaultFarm,
      sector: '',
      inspectionNature: 'PERIODICA',
      inspectionDate: todayStr,
      inspectionEndDate: todayStr,
      issueDate: todayStr,
      technicalResponsible: 'Eng. Carlos Eduardo Mendes',
      creaNumber: 'CREA-PE 12345-D',
      artNumber: '',
      equipmentPhoto: '',
      // CNPJ permanece em aberto para preenchimento manual
      companyData: { ...farmProfile, cnpj: '' },
      scope: {
        externalVisual: { performed: false, note: '' },
        internalVisual: { performed: false, note: '' },
        ultrassom: { performed: false, note: '' },
        safetyDevices: { performed: false, note: '' },
        documentAnalysis: { performed: false, note: '' }
      },
      parties: {
        owner: farmProfile.razaoSocial,
        contractor: 'el Ciruelo - Gerência de Manutenção',
        inspectionCompany: 'Inspetec Engenharia NR-13 Ltda',
        responsibleSpecialty: 'Engenheiro Mecânico e de Segurança do Trabalho (PH)',
        inspectionCompanion: ''
      },
      equipment: {
        manufacturer: '',
        model: '',
        serialNumber: '',
        manufactureYear: '',
        projectCode: 'ASME Seção VIII Div. 1',
        designCodeEdition: '',
        geometricVolume: 0,
        volumeUnit: 'L',
        serviceFluid: 'Ar Comprimido',
        fluidGroup: 'Grupo 2',
        pmta: 0,
        pth: '',
        normalOperatingPressure: 0,
        maxOperatingPressure: '',
        equipmentType: 'Vaso de Pressão',
        vesselPurpose: '',
        vesselType: '',
        outerDiameter: '',
        length: '',
        tareWeight: '',
        bodyThickness: '',
        headThickness: '',
        headBottomLeft: '',
        headTopRight: '',
        height: '',
        width: '',
        minBodyThickness: '',
        minHeadThickness: '',
        local: defaultFarm,
        area: '',
        designTemperature: '',
        operatingTemperature: '',
        material: '',
        mainDimensions: '',
        installationConfig: 'VERTICAL'
      },
      nr13Categorization: {
        fluidClass: 'C',
        pressureMpa: 0,
        volumeM3: 0,
        pvProduct: 0,
        category: 'IV',
        riskGroup: 'Grupo 4 (Categoria IV)'
      },
      // Item 5 em aberto para preenchimento manual
      vesselChecklist: { ...EMPTY_VESSEL_CHECKLIST },
      devicesVerification: {
        safetyValveCondition: 'CONFORME',
        safetyValveNotes: '',
        pressureGaugeCondition: 'CONFORME',
        pressureGaugeNotes: '',
        drainsAndVentsCondition: 'CONFORME',
        drainsAndVentsNotes: '',
        nameplateCondition: 'CONFORME',
        nameplateNotes: ''
      },
      // Item 6 em aberto para preenchimento manual com os dados obtidos
      ultrassomPerformed: '',
      ultrassomPoints: [],
      ultrassomMatrix: { ...EMPTY_MATRIX },
      ultrassomEquipmentUsed: '',
      // Item 7 (técnico) pode ser puxado; Item 8 (inspeções na válvula) fica em aberto
      safetyValveTechnical: {
        visualInspection: '',
        calibrationStatus: '',
        leakage: ''
      },
      pressureGaugeTechnical: {},
      // Item 9 em aberto
      documentationCheck: { ...EMPTY_DOC_CHECK },
      nonConformities: [],
      // Itens 10, 11 e 12 em aberto
      recommendations: '',
      technicalOpinion: 'INCONCLUSIVO',
      operationalRestrictionsNotes: '',
      conclusionCheck: {
        conforme: false,
        naoConforme: false,
        releasedWithRestrictions: false
      },
      nextInspections: {
        nextExternalInspectionDate: '',
        nextInternalInspectionDate: '',
        nextComplementaryTestDate: ''
      },
      // Itens 13 a 16 em aberto
      photos: [],
      artAttachment: undefined,
      valveCalibrationAttachment: undefined,
      ultrassomAttachment: undefined,
      createdAt: new Date().toISOString()
    };
  };

  const [formData, setFormData] = useState<NR13InspectionReport>(buildInitialReport);

  const vesselsForSelectedFarm = useMemo(
    () =>
      (nr13Vessels || [])
        .filter(v => v.farm === formData.farm)
        .sort((a, b) => a.vesselNumber.localeCompare(b.vesselNumber, 'pt-BR', { numeric: true })),
    [nr13Vessels, formData.farm]
  );

  const valvesForSelectedFarm = useMemo(
    () => (valveCalibrations || []).filter(v => v.farm === formData.farm),
    [valveCalibrations, formData.farm]
  );

  // Auto-fill fixed vessel, company (except CNPJ), Section 3, Section 4, Section 7 valve specs.
  // Preserves open/manual sections: CNPJ, Section 5, Section 6 (ultrassom), Section 8 (valve inspection), Sections 9-16.
  const applyVesselAutoFill = (vessel: NR13VesselMaster) => {
    const farm = vessel.farm;
    const vesselNumLower = (vessel.vesselNumber || '').trim().toLowerCase();
    const vesselTagLower = (vessel.equipmentTag || '').trim().toLowerCase();
    const primaryVesselCode = vesselNumLower.split(/[\s(/]+/)[0];

    const linkedTags = (vessel.linkedValveTag || '')
      .split(/[\/,;+]+/)
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const matchedValves = (valveCalibrations || []).filter(v => {
      if (v.farm !== farm) return false;
      if (linkedTags.length > 0 && linkedTags.includes(v.tag.toLowerCase())) return true;
      const linkedLower = (v.equipmentLinked || '').toLowerCase();
      if (!primaryVesselCode) return false;
      const codePrefix = linkedLower.split(/[\s(/]+/)[0];
      return codePrefix === primaryVesselCode || (vesselTagLower && linkedLower === vesselTagLower);
    });

    const primaryValve = matchedValves[0];

    setSelectedVesselId(vessel.id);
    setFormData(prev => {
      // Keep Section 8 (inspeção visual, calibração, vazamento) untouched for manual field entry
      const existingValveInsp = prev.safetyValveTechnical || {};
      const valveTech: NR13SafetyValveTechnical = matchedValves.length > 0
        ? {
            tag: matchedValves.map(m => m.tag).join(' / '),
            manufacturer: Array.from(new Set(matchedValves.map(m => m.manufacturer).filter(Boolean))).join(' / '),
            model: Array.from(new Set(matchedValves.map(m => m.model).filter(Boolean))).join(' / '),
            connectionSize: Array.from(new Set(matchedValves.map(m => m.connectionSize).filter(Boolean))).join(' / '),
            fluidType: primaryValve.fluidType,
            setPressure: Array.from(new Set(matchedValves.map(m => `${m.setPressure} ${m.pressureUnit}`))).join(' / '),
            openingPressure: Array.from(new Set(matchedValves.map(m => `${m.openingPressure} ${m.pressureUnit}`))).join(' / '),
            reseatPressure: matchedValves.some(m => m.reseatPressure !== undefined)
              ? Array.from(new Set(matchedValves.filter(m => m.reseatPressure !== undefined).map(m => `${m.reseatPressure} ${m.pressureUnit}`))).join(' / ')
              : undefined,
            certificateNumber: matchedValves.map(m => m.code).join(' / '),
            calibrationDate: primaryValve.calibrationDate,
            nextCalibrationDate: primaryValve.nextCalibrationDate,
            visualInspection: existingValveInsp.visualInspection || '',
            calibrationStatus: existingValveInsp.calibrationStatus || '',
            leakage: existingValveInsp.leakage || ''
          }
        : {
            ...(vessel.linkedValveSpecs || {}),
            visualInspection: existingValveInsp.visualInspection || '',
            calibrationStatus: existingValveInsp.calibrationStatus || '',
            leakage: existingValveInsp.leakage || ''
          };

      const baseCompany = vessel.companyData || FARM_COMPANY_PROFILES[vessel.farm];

      return {
        ...prev,
        farm: vessel.farm,
        vesselNumber: vessel.vesselNumber,
        equipmentTag: vessel.equipmentTag,
        sector: vessel.sector,
        equipmentPhoto: vessel.equipmentPhoto || prev.equipmentPhoto,
        // CNPJ permanece em aberto (mantém o valor já digitado ou vazio)
        companyData: {
          ...baseCompany,
          cnpj: prev.companyData?.cnpj || ''
        },
        parties: {
          ...prev.parties,
          owner: baseCompany.razaoSocial || FARM_COMPANY_PROFILES[vessel.farm].razaoSocial
        },
        equipment: JSON.parse(JSON.stringify(vessel.equipment)),
        nr13Categorization: JSON.parse(JSON.stringify(vessel.nr13Categorization)),
        safetyValveTechnical: valveTech,
        devicesVerification: {
          ...prev.devicesVerification,
          safetyValveNotes: valveTech.tag
            ? `Válvula(s) ${valveTech.tag} (${valveTech.manufacturer || '-'}) • Set: ${valveTech.setPressure || '-'} • Cert.: ${valveTech.certificateNumber || '-'}`
            : prev.devicesVerification.safetyValveNotes
        }
      };
    });

    const tipoLabel = vessel.assetType === 'CP' ? 'CP' : 'VP';
    const linkedInfo =
      matchedValves.length > 0
        ? `Válvula(s) ${matchedValves.map(m => m.tag).join(' / ')}`
        : vessel.linkedValveTag
        ? `Válvula ${vessel.linkedValveTag}`
        : '';

    setAutoFillFeedback(
      `Dados técnicos de [${tipoLabel}] ${vessel.vesselNumber} (${vessel.farm}) carregados${linkedInfo ? ` com ${linkedInfo}` : ''}! CNPJ, Seções 5, 6, 8, 9, 10, 11, 12, fotos e anexos permanecem em aberto.`
    );
  };

  // Run once on mount if preselectedVessel was passed
  useEffect(() => {
    if (!report && preselectedVessel) {
      applyVesselAutoFill(preselectedVessel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFarmSelection = (newFarm: Farm) => {
    const farmProfile: NR13CompanyData = { ...FARM_COMPANY_PROFILES[newFarm] };
    setSelectedVesselId('');
    setAutoFillFeedback(null);
    setFormData(prev => ({
      ...prev,
      farm: newFarm,
      companyData: {
        ...farmProfile,
        cnpj: prev.companyData?.cnpj || ''
      },
      parties: {
        ...prev.parties,
        owner: farmProfile.razaoSocial
      },
      equipment: {
        ...prev.equipment,
        local: newFarm
      }
    }));
  };

  const handlePressureOrVolumeChange = (pmtaVal: number, volumeVal: number, unit?: 'L' | 'm³') => {
    const volUnit = unit || formData.equipment.volumeUnit;
    const pressMpa = Number((pmtaVal * 0.0980665).toFixed(2));
    const volM3 = Number((volUnit === 'm³' ? volumeVal : volumeVal / 1000).toFixed(3));
    const pv = Number((pressMpa * volM3).toFixed(2));

    let cat: NR13Category = 'V';
    if (pv >= 100) cat = 'I';
    else if (pv >= 30) cat = 'II';
    else if (pv >= 2.5) cat = 'III';
    else if (pv >= 1) cat = 'IV';

    setFormData(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        pmta: pmtaVal,
        geometricVolume: volumeVal,
        volumeUnit: volUnit
      },
      nr13Categorization: {
        ...prev.nr13Categorization,
        pressureMpa: pressMpa,
        volumeM3: volM3,
        pvProduct: pv,
        category: cat,
        riskGroup: `Grupo ${cat === 'I' ? 1 : cat === 'II' ? 2 : cat === 'III' ? 3 : cat === 'IV' ? 4 : 5} (Categoria ${cat})`
      }
    }));
  };

  const handleSaveVesselToMaster = async () => {
    const vesselNum = (formData.vesselNumber || formData.equipmentTag.split(' ')[0] || '').trim();
    if (!vesselNum) {
      setValidationError('Informe o Nº do VP ou CP na Capa antes de salvar na base fixa.');
      return;
    }
    setValidationError(null);
    const existing = (nr13Vessels || []).find(
      v => v.farm === formData.farm && v.vesselNumber.toLowerCase() === vesselNum.toLowerCase()
    );
    const detectedAssetType: 'VP' | 'CP' =
      existing?.assetType ||
      (vesselNum.toUpperCase().startsWith('CP') || (formData.equipment.equipmentType || '').toLowerCase().includes('compressor')
        ? 'CP'
        : 'VP');

    const masterRecord: NR13VesselMaster = {
      id: existing?.id || `vessel_${Date.now()}`,
      farm: formData.farm,
      assetType: detectedAssetType,
      vesselNumber: vesselNum,
      equipmentTag: formData.equipmentTag || vesselNum,
      sector: formData.sector,
      companyData: formData.companyData || { ...FARM_COMPANY_PROFILES[formData.farm], cnpj: '' },
      equipment: formData.equipment,
      nr13Categorization: formData.nr13Categorization,
      linkedValveTag: formData.safetyValveTechnical?.tag || existing?.linkedValveTag,
      linkedValveSpecs: formData.safetyValveTechnical
        ? {
            tag: formData.safetyValveTechnical.tag,
            manufacturer: formData.safetyValveTechnical.manufacturer,
            model: formData.safetyValveTechnical.model,
            connectionSize: formData.safetyValveTechnical.connectionSize,
            fluidType: formData.safetyValveTechnical.fluidType,
            setPressure: formData.safetyValveTechnical.setPressure,
            openingPressure: formData.safetyValveTechnical.openingPressure,
            reseatPressure: formData.safetyValveTechnical.reseatPressure,
            certificateNumber: formData.safetyValveTechnical.certificateNumber,
            calibrationDate: formData.safetyValveTechnical.calibrationDate,
            nextCalibrationDate: formData.safetyValveTechnical.nextCalibrationDate
          }
        : existing?.linkedValveSpecs,
      linkedGaugeTag: formData.pressureGaugeTechnical?.tag || existing?.linkedGaugeTag,
      linkedGaugeSpecs: formData.pressureGaugeTechnical || existing?.linkedGaugeSpecs,
      defaultUltrassomMatrix: existing?.defaultUltrassomMatrix,
      equipmentPhoto: formData.equipmentPhoto || existing?.equipmentPhoto,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await saveNR13Vessel(masterRecord);
    setSelectedVesselId(masterRecord.id);
    setAutoFillFeedback(`[${detectedAssetType}] ${vesselNum} (${formData.farm}) salvo na base para próximos laudos!`);
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 960, 720, 0.72);
    if (compressed) {
      setFormData(prev => ({ ...prev, equipmentPhoto: compressed }));
    }
  };

  const handleExtraPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const c = await compressImage(files[i], 960, 720, 0.7);
      if (c) added.push(c);
    }
    if (added.length > 0) {
      setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), ...added] }));
    }
  };

  const updateMatrix = (key: 'body' | 'leftHead' | 'rightHead', idx: number, value: string) => {
    setFormData(prev => {
      const current = prev.ultrassomMatrix || { ...EMPTY_MATRIX };
      const arr = [...current[key]] as [string, string, string, string];
      arr[idx] = value;
      return {
        ...prev,
        ultrassomMatrix: {
          ...current,
          [key]: arr
        }
      };
    });
  };

  const handleAddUltrassomPoint = () => {
    const nextIdx = (formData.ultrassomPoints?.length || 0) + 1;
    const newPoint: NR13UltrassomPoint = {
      pointId: `P-${nextIdx < 10 ? '0' + nextIdx : nextIdx}`,
      location: 'Costado / Tampo',
      measuredThickness: 6.00,
      minAllowedThickness: 4.50,
      status: 'CONFORME',
      observation: ''
    };
    setFormData(prev => ({
      ...prev,
      ultrassomPoints: [...(prev.ultrassomPoints || []), newPoint]
    }));
  };

  const handleRemoveUltrassomPoint = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      ultrassomPoints: prev.ultrassomPoints.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateUltrassomPoint = (idx: number, field: keyof NR13UltrassomPoint, val: any) => {
    setFormData(prev => {
      const updated = [...prev.ultrassomPoints];
      const pt = { ...updated[idx], [field]: val };
      if (field === 'measuredThickness' || field === 'minAllowedThickness') {
        pt.status = Number(pt.measuredThickness) >= Number(pt.minAllowedThickness) ? 'CONFORME' : 'NAO_CONFORME';
      }
      updated[idx] = pt;
      return { ...prev, ultrassomPoints: updated };
    });
  };

  const updateVesselCheck = (field: keyof NR13VesselChecklist, val: string) => {
    setFormData(prev => ({
      ...prev,
      vesselChecklist: {
        ...(prev.vesselChecklist || EMPTY_VESSEL_CHECKLIST),
        [field]: val
      }
    }));
  };

  const updateDocCheck = (field: keyof NR13DocumentationCheck, val: string) => {
    setFormData(prev => ({
      ...prev,
      documentationCheck: {
        ...(prev.documentationCheck || EMPTY_DOC_CHECK),
        [field]: val
      }
    }));
  };

  const handleOpinionChange = (opinion: NR13Opinion) => {
    setFormData(prev => ({
      ...prev,
      technicalOpinion: opinion,
      conclusionCheck: {
        conforme: opinion === 'FAVORAVEL',
        naoConforme: opinion === 'DESFAVORAVEL',
        releasedWithRestrictions: opinion === 'FAVORAVEL_COM_RESTRICOES'
      }
    }));
  };

  const handleSelectValveFromBase = (valveId: string) => {
    const found = valvesForSelectedFarm.find(v => v.id === valveId);
    if (!found) return;
    setFormData(prev => ({
      ...prev,
      safetyValveTechnical: {
        ...(prev.safetyValveTechnical || {}),
        tag: found.tag,
        manufacturer: found.manufacturer,
        model: found.model,
        connectionSize: found.connectionSize,
        fluidType: found.fluidType,
        setPressure: `${found.setPressure} ${found.pressureUnit}`,
        openingPressure: `${found.openingPressure} ${found.pressureUnit}`,
        reseatPressure: found.reseatPressure ? `${found.reseatPressure} ${found.pressureUnit}` : undefined,
        certificateNumber: found.code,
        calibrationDate: found.calibrationDate,
        nextCalibrationDate: found.nextCalibrationDate
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setValidationError('Informe o Nº do Relatório na aba 1 (Capa).');
      setActiveFormSection('geral');
      return;
    }
    if (!formData.vesselNumber?.trim() && !formData.equipmentTag.trim()) {
      setValidationError('Selecione um VP/CP cadastrado ou informe o Nº do VP / CP na aba 1 (Capa).');
      setActiveFormSection('geral');
      return;
    }
    setValidationError(null);
    const normalized: NR13InspectionReport = {
      ...formData,
      vesselNumber: formData.vesselNumber?.trim() || formData.equipmentTag.trim(),
      equipmentTag: formData.equipmentTag.trim() || formData.vesselNumber?.trim() || 'Equipamento NR-13'
    };
    onSave(normalized);
  };

  const company = formData.companyData || { ...FARM_COMPANY_PROFILES[formData.farm], cnpj: '' };
  const vc = formData.vesselChecklist || EMPTY_VESSEL_CHECKLIST;
  const dc = formData.documentationCheck || EMPTY_DOC_CHECK;
  const matrix = formData.ultrassomMatrix || EMPTY_MATRIX;
  const sv = formData.safetyValveTechnical || {};
  const conc = formData.conclusionCheck || {
    conforme: false,
    naoConforme: false,
    releasedWithRestrictions: false
  };

  return (
    <div className={
      isDedicatedScreen
        ? 'max-w-5xl mx-auto pb-16 space-y-4 animate-in fade-in duration-150'
        : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
    }>
      <div className={
        isDedicatedScreen
          ? 'bg-white rounded-2xl shadow-lg w-full flex flex-col border border-slate-200 overflow-hidden'
          : 'bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-300 overflow-hidden'
      }>
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {isDedicatedScreen && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}
            <img
              src="/assets/aistudio/image_adab39d7.png"
              alt="el Ciruelo"
              className="h-8 w-auto object-contain bg-white/10 px-2 py-0.5 rounded-md shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-fuchsia-200 text-fuchsia-950 uppercase tracking-wider">
                  NR-13 • Vaso de Pressão
                </span>
                <span className="text-xs text-slate-300 font-mono">{formData.code}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {report ? 'Editar Relatório Oficial NR-13' : 'Novo Relatório de Inspeção NR-13 (Padrão Oficial)'}
              </h2>
            </div>
          </div>

          {!isDedicatedScreen && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Auto-Fill Quick Selector Bar (Fazenda + Nº do VP ou CP) */}
        <div className="bg-gradient-to-r from-emerald-50 via-white to-fuchsia-50 border-b border-emerald-200 px-5 py-3 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-extrabold text-emerald-950">
                Puxar Dados Fixos por Fazenda &amp; Nº do VP / CP:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={formData.farm}
                onChange={e => handleFarmSelection(e.target.value as Farm)}
                className="text-xs p-1.5 rounded-lg border border-emerald-300 bg-white font-bold text-slate-900"
              >
                {FARMS.map(f => (
                  <option key={f} value={f}>Fazenda: {f}</option>
                ))}
              </select>

              <select
                value={selectedVesselId}
                onChange={e => {
                  const found = (nr13Vessels || []).find(v => v.id === e.target.value);
                  if (found) applyVesselAutoFill(found);
                  else setSelectedVesselId('');
                }}
                className="text-xs p-1.5 rounded-lg border border-fuchsia-300 bg-white font-bold text-fuchsia-950 w-full sm:w-auto sm:min-w-[240px]"
              >
                <option value="">
                  {vesselsForSelectedFarm.length > 0
                    ? `-- Selecionar VP / CP (${vesselsForSelectedFarm.length} na fazenda) --`
                    : '-- Nenhum VP ou CP cadastrado nesta fazenda --'}
                </option>
                {vesselsForSelectedFarm.map(v => (
                  <option key={v.id} value={v.id}>
                    [{v.assetType || 'VP'}] {v.vesselNumber} • {v.equipmentTag}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSaveVesselToMaster}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer transition-colors"
                title="Salva os dados técnicos atuais deste VP/CP na base fixa da fazenda para reutilizar nos próximos laudos"
              >
                <Database className="w-3.5 h-3.5 text-emerald-300" />
                <span>Salvar como Padrão VP/CP</span>
              </button>
            </div>
          </div>
          {autoFillFeedback && (
            <p className="text-[11px] font-bold text-emerald-800 mt-1.5">
              ✓ {autoFillFeedback}
            </p>
          )}
          {validationError && (
            <p className="text-[11px] font-bold text-red-700 mt-1">
              ⚠ {validationError}
            </p>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveFormSection('geral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFormSection === 'geral'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-emerald-700" />
            <span>1. Capa, Empresa &amp; Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormSection('equipamento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFormSection === 'equipamento'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-700" />
            <span>2. Dados Técnicos &amp; Categoria</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormSection('inspecoes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFormSection === 'inspecoes'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>3. Inspeções, Ultrassom &amp; Válvula</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormSection('anexos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFormSection === 'anexos'
                ? 'bg-fuchsia-900 text-white shadow-xs'
                : 'text-fuchsia-900 bg-fuchsia-100/70 hover:bg-fuchsia-100'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>4. Fotos &amp; Anexos (14–16)</span>
            {(formData.artAttachment || formData.valveCalibrationAttachment || formData.ultrassomAttachment) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFormSection('parecer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFormSection === 'parecer'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>5. Recomendações &amp; Conclusão</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={isDedicatedScreen ? 'p-4 sm:p-6 space-y-6' : 'flex-1 overflow-y-auto p-5 sm:p-6 space-y-6'}>
          {/* 1. CAPA, EMPRESA & FOTO */}
          {activeFormSection === 'geral' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relatório N.º</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">VP / CP N.º (Capa)</label>
                  <input
                    type="text"
                    value={formData.vesselNumber || ''}
                    onChange={e => setFormData({ ...formData, vesselNumber: e.target.value })}
                    placeholder="Ex: VP-01 ou CP-01"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-fuchsia-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Setor / Área</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="Ex: Sala de Máquinas"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Identificação Completa / TAG</label>
                  <input
                    type="text"
                    value={formData.equipmentTag}
                    onChange={e => setFormData({ ...formData, equipmentTag: e.target.value })}
                    placeholder="Ex: VP-01 - Reservatório de Ar Comprimido"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Inspeção</label>
                  <select
                    value={formData.inspectionNature}
                    onChange={e => setFormData({ ...formData, inspectionNature: e.target.value as NR13InspectionNature })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
                  >
                    <option value="INICIAL">Inicial</option>
                    <option value="PERIODICA">Periódica</option>
                    <option value="EXTRAORDINARIA">Extraordinária</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ART N.º</label>
                  <input
                    type="text"
                    value={formData.artNumber}
                    onChange={e => setFormData({ ...formData, artNumber: e.target.value })}
                    placeholder="Ex: PE20260123456"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono font-bold text-fuchsia-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Início da Inspeção</label>
                  <input
                    type="date"
                    value={formData.inspectionDate}
                    onChange={e => setFormData({ ...formData, inspectionDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Término da Inspeção</label>
                  <input
                    type="date"
                    value={formData.inspectionEndDate || formData.inspectionDate}
                    onChange={e => setFormData({ ...formData, inspectionEndDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Emissão</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Cover Photo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase">Imagem do Equipamento (Capa — Página 1)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Foto principal exibida no quadro central da Capa do PDF. Preenchida automaticamente se o vaso estiver cadastrado.
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>{formData.equipmentPhoto ? 'Alterar Foto da Capa' : 'Adicionar Foto da Capa'}</span>
                      <input type="file" accept="image/*" onChange={handleCoverPhotoUpload} className="hidden" />
                    </label>
                    {formData.equipmentPhoto && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, equipmentPhoto: '' })}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                {formData.equipmentPhoto ? (
                  <img
                    src={formData.equipmentPhoto}
                    alt="Capa do equipamento"
                    className="h-24 w-36 object-cover rounded-lg border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="h-24 w-36 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-[11px] text-slate-400">
                    Sem foto na capa
                  </div>
                )}
              </div>

              {/* 2. DADOS DA EMPRESA */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  2. Dados da Empresa (CNPJ em aberto para preenchimento manual)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Razão Social</label>
                    <input
                      type="text"
                      value={company.razaoSocial}
                      onChange={e => setFormData({ ...formData, companyData: { ...company, razaoSocial: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CNPJ (Manual / Em aberto)</label>
                    <input
                      type="text"
                      value={company.cnpj}
                      placeholder="00.000.000/0000-00"
                      onChange={e => setFormData({ ...formData, companyData: { ...company, cnpj: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={company.address}
                      onChange={e => setFormData({ ...formData, companyData: { ...company, address: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cidade/UF</label>
                    <input
                      type="text"
                      value={company.cityState}
                      onChange={e => setFormData({ ...formData, companyData: { ...company, cityState: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CEP</label>
                    <input
                      type="text"
                      value={company.cep}
                      onChange={e => setFormData({ ...formData, companyData: { ...company, cep: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Responsável Técnico */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Profissional Habilitado (PH) &amp; Acompanhante
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Responsável pela Inspeção (PH)</label>
                    <input
                      type="text"
                      value={formData.technicalResponsible}
                      onChange={e => setFormData({ ...formData, technicalResponsible: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CREA / UF</label>
                    <input
                      type="text"
                      value={formData.creaNumber}
                      onChange={e => setFormData({ ...formData, creaNumber: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Empresa Inspetora</label>
                    <input
                      type="text"
                      value={formData.parties.inspectionCompany}
                      onChange={e => setFormData({ ...formData, parties: { ...formData.parties, inspectionCompany: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Acompanhante na Empresa</label>
                    <input
                      type="text"
                      value={formData.parties.inspectionCompanion}
                      onChange={e => setFormData({ ...formData, parties: { ...formData.parties, inspectionCompanion: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. DADOS TÉCNICOS DO VASO (SEÇÕES 3 E 4) */}
          {activeFormSection === 'equipamento' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Dados Técnicos do Vaso &amp; 4. Categoria NR-13
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fabricante</label>
                  <input type="text" value={formData.equipment.manufacturer} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, manufacturer: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ano de Fabricação</label>
                  <input type="text" value={formData.equipment.manufactureYear} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, manufactureYear: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">PTH</label>
                  <input type="text" value={formData.equipment.pth || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, pth: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">PMTA (kgf/cm²)</label>
                  <input type="number" step="0.01" value={formData.equipment.pmta} onChange={e => handlePressureOrVolumeChange(parseFloat(e.target.value) || 0, formData.equipment.geometricVolume)} className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pressão Máx. Operação</label>
                  <input type="text" value={formData.equipment.maxOperatingPressure || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, maxOperatingPressure: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo Equipamento</label>
                  <input type="text" value={formData.equipment.equipmentType || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, equipmentType: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº de Série</label>
                  <input type="text" value={formData.equipment.serialNumber} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, serialNumber: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Volume</label>
                  <div className="flex space-x-1">
                    <input type="number" step="0.01" value={formData.equipment.geometricVolume} onChange={e => handlePressureOrVolumeChange(formData.equipment.pmta, parseFloat(e.target.value) || 0)} className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold" />
                    <select value={formData.equipment.volumeUnit} onChange={e => handlePressureOrVolumeChange(formData.equipment.pmta, formData.equipment.geometricVolume, e.target.value as 'L' | 'm³')} className="text-xs p-2 rounded-lg border border-slate-300 font-bold">
                      <option value="L">L</option>
                      <option value="m³">m³</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Norma do Projeto</label>
                  <input type="text" value={formData.equipment.projectCode} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, projectCode: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Edição</label>
                  <input type="text" value={formData.equipment.designCodeEdition || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, designCodeEdition: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Finalidade do Vaso</label>
                  <input type="text" value={formData.equipment.vesselPurpose || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, vesselPurpose: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Vaso</label>
                  <input type="text" value={formData.equipment.vesselType || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, vesselType: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Diâmetro Externo</label>
                  <input type="text" value={formData.equipment.outerDiameter || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, outerDiameter: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Comprimento</label>
                  <input type="text" value={formData.equipment.length || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, length: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tara</label>
                  <input type="text" value={formData.equipment.tareWeight || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, tareWeight: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Modelo</label>
                  <input type="text" value={formData.equipment.model} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, model: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Espessura do Corpo</label>
                  <input type="text" value={formData.equipment.bodyThickness || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, bodyThickness: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Espessura da Calota</label>
                  <input type="text" value={formData.equipment.headThickness || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, headThickness: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Calota (Inf. Esquerdo)</label>
                  <input type="text" value={formData.equipment.headBottomLeft || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, headBottomLeft: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Calota (Sup. Direito)</label>
                  <input type="text" value={formData.equipment.headTopRight || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, headTopRight: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Altura</label>
                  <input type="text" value={formData.equipment.height || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, height: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Largura</label>
                  <input type="text" value={formData.equipment.width || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, width: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Espessura Mínima Corpo</label>
                  <input type="text" value={formData.equipment.minBodyThickness || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, minBodyThickness: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Espessura Mínima Calota</label>
                  <input type="text" value={formData.equipment.minHeadThickness || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, minHeadThickness: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Local</label>
                  <input type="text" value={formData.equipment.local || formData.farm} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, local: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Área</label>
                  <input type="text" value={formData.equipment.area || formData.sector} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, area: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Material Fabricação</label>
                  <input type="text" value={formData.equipment.material} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, material: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Temperatura Projeto / Trabalho</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input type="text" value={formData.equipment.designTemperature} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, designTemperature: e.target.value } })} placeholder="Proj." className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                    <input type="text" value={formData.equipment.operatingTemperature || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, operatingTemperature: e.target.value } })} placeholder="Trab." className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                  </div>
                </div>
              </div>

              {/* 4. Determinação da Categoria */}
              <div className="bg-gradient-to-r from-fuchsia-50 to-slate-50 p-4 rounded-xl border border-fuchsia-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-fuchsia-950 uppercase tracking-wider">
                    4. Determinação da Categoria do Vaso
                  </h4>
                  <span className="px-3 py-1 rounded-md bg-fuchsia-900 text-white font-black text-xs">
                    CATEGORIA {formData.nr13Categorization.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Fluido de Trabalho</label>
                    <input
                      type="text"
                      value={formData.equipment.serviceFluid}
                      onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, serviceFluid: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Classe do Fluido</label>
                    <select
                      value={formData.nr13Categorization.fluidClass}
                      onChange={e => setFormData({ ...formData, nr13Categorization: { ...formData.nr13Categorization, fluidClass: e.target.value as any } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold"
                    >
                      <option value="A">Classe A (Tóxico / Inflamável)</option>
                      <option value="B">Classe B (Combustível)</option>
                      <option value="C">Classe C (Vapor / Ar Comprimido)</option>
                      <option value="D">Classe D (Outros)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Grupo Potencial de Risco</label>
                    <input
                      type="text"
                      value={formData.nr13Categorization.riskGroup || `Categoria ${formData.nr13Categorization.category}`}
                      onChange={e => setFormData({ ...formData, nr13Categorization: { ...formData.nr13Categorization, riskGroup: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  Pressão P = <strong>{formData.nr13Categorization.pressureMpa} MPa</strong> | Volume V = <strong>{formData.nr13Categorization.volumeM3} m³</strong> | Pressão × Volume = <strong>{formData.nr13Categorization.pvProduct} MPa·m³</strong>
                </div>
              </div>
            </div>
          )}

          {/* 3. INSPEÇÕES DO VASO, TESTES ULTRASSOM, VÁLVULA & DOCUMENTAÇÃO (SEÇÕES 5–9) */}
          {activeFormSection === 'inspecoes' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Seção 5 (Em aberto para preenchimento manual via lista suspensa abreviada) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      5. Tipo e Descrição da(s) Inspeção(ões) Realizada(s)
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Selecione para cada pergunta: <strong>C</strong> (Conforme), <strong>NC</strong> (Não Conforme) ou <strong>NA</strong> (Não Aplicável).
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allC: NR13VesselChecklist = {
                          visualInspection: 'C',
                          thicknessMeasurement: 'C',
                          safetyValveCalibration: 'C',
                          leakage: 'C',
                          stickerInstallation: 'C',
                          factoryInfoSticker: 'C',
                          easyAccess: 'C',
                          confinedSpace: 'C',
                          emergencyLighting: 'C',
                          operatesNormally: 'C',
                          meetsAllNR13: 'C',
                          matchesDossier: 'C',
                          anomalyFound: 'C',
                          hasPressureGauge: 'C',
                          hasSafetyValve: 'C',
                          identificationNumber: 'C'
                        };
                        setFormData(prev => ({ ...prev, vesselChecklist: allC }));
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 cursor-pointer"
                    >
                      Marcar todos C
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, vesselChecklist: { ...EMPTY_VESSEL_CHECKLIST } }))}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {([
                    ['visualInspection', 'Inspeção visual'],
                    ['thicknessMeasurement', 'Medição de espessura'],
                    ['safetyValveCalibration', 'Calibração de válvula de segurança'],
                    ['leakage', 'Vazamento'],
                    ['stickerInstallation', 'Instalação de adesivo'],
                    ['factoryInfoSticker', 'Adesivo com informações de fábrica'],
                    ['easyAccess', 'Local de fácil acesso'],
                    ['confinedSpace', 'Local confinado'],
                    ['emergencyLighting', 'Iluminação de emergência'],
                    ['operatesNormally', 'O vaso de pressão funciona normalmente'],
                    ['meetsAllNR13', 'Satisfaz todas as condições da NR-13'],
                    ['matchesDossier', 'Confere com o Prontuário'],
                    ['anomalyFound', 'Anomalia que prejudica segurança'],
                    ['hasPressureGauge', 'Possui manômetro'],
                    ['hasSafetyValve', 'Possui válvula de segurança'],
                    ['identificationNumber', 'Número de identificação']
                  ] as Array<[keyof NR13VesselChecklist, string]>).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">{label}</label>
                      <ComplianceDropdown
                        value={vc[key]}
                        onChange={val => updateVesselCheck(key, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção 6: Testes Realizados — Tabela 6 Colunas (Em aberto para preenchimento manual) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      6. Testes Realizados — Medição de Espessura por Ultrassom
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Em aberto para preenchimento manual dos pontos P1–P4 (Corpo) e B1–B4 (Tampos) obtidos em campo.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-bold text-slate-700">Foi realizado medição por ultrassom?</label>
                    <select
                      value={formData.ultrassomPerformed ?? ''}
                      onChange={e => {
                        const val = e.target.value as 'SIM' | 'NAO' | '';
                        setFormData({
                          ...formData,
                          ultrassomPerformed: val,
                          scope: {
                            ...formData.scope,
                            ultrassom: { ...formData.scope.ultrassom, performed: val === 'SIM' }
                          }
                        });
                      }}
                      className="text-xs p-1.5 rounded border border-amber-300 bg-white font-bold"
                    >
                      <option value="">-- Em aberto --</option>
                      <option value="SIM">Sim</option>
                      <option value="NAO">Não</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Medidor de Espessura por Ultrassom / Equipamento de Aferição
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewUltrassomModal(true)}
                      className="inline-flex items-center space-x-1 text-[11px] font-bold text-cyan-950 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar outro equipamento de aferição</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      value={
                        (ultrassomEquipments || []).some(
                          u => formatUltrassomEquipmentLabel(u) === (formData.ultrassomEquipmentUsed || '')
                        )
                          ? formData.ultrassomEquipmentUsed
                          : ''
                      }
                      onChange={e => {
                        if (e.target.value) {
                          setFormData({ ...formData, ultrassomEquipmentUsed: e.target.value });
                        }
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-cyan-300 bg-cyan-50/40 font-bold text-slate-800"
                    >
                      <option value="">-- Selecionar equipamento cadastrado ({(ultrassomEquipments || []).length}) --</option>
                      {(ultrassomEquipments || []).map(u => {
                        const formatted = formatUltrassomEquipmentLabel(u);
                        return (
                          <option key={u.id} value={formatted}>
                            {formatted}
                          </option>
                        );
                      })}
                    </select>

                    <input
                      type="text"
                      value={formData.ultrassomEquipmentUsed || ''}
                      onChange={e => setFormData({ ...formData, ultrassomEquipmentUsed: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      placeholder="Ou preencha manualmente o instrumento / dados obtidos..."
                    />
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-center">
                    <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th colSpan={2} className="p-2 border-r border-slate-300">CORPO</th>
                        <th colSpan={2} className="p-2 border-r border-slate-300">TAMPO ESQUERDO</th>
                        <th colSpan={2} className="p-2">TAMPO DIREITO</th>
                      </tr>
                      <tr className="bg-slate-50 text-[11px] border-b border-slate-200">
                        <th className="p-1.5 border-r border-slate-200">PONTO</th>
                        <th className="p-1.5 border-r border-slate-300">MEDIDA</th>
                        <th className="p-1.5 border-r border-slate-200">PONTO</th>
                        <th className="p-1.5 border-r border-slate-300">MEDIDA</th>
                        <th className="p-1.5 border-r border-slate-200">PONTO</th>
                        <th className="p-1.5">MEDIDA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[0, 1, 2, 3].map(idx => (
                        <tr key={idx}>
                          <td className="p-1.5 font-bold border-r border-slate-200">P{idx + 1}</td>
                          <td className="p-1 border-r border-slate-300">
                            <input type="text" placeholder="mm" value={matrix.body[idx]} onChange={e => updateMatrix('body', idx, e.target.value)} className="w-full text-center text-xs p-1 border border-slate-300 rounded font-semibold" />
                          </td>
                          <td className="p-1.5 font-bold border-r border-slate-200">B{idx + 1}</td>
                          <td className="p-1 border-r border-slate-300">
                            <input type="text" placeholder="mm" value={matrix.leftHead[idx]} onChange={e => updateMatrix('leftHead', idx, e.target.value)} className="w-full text-center text-xs p-1 border border-slate-300 rounded font-semibold" />
                          </td>
                          <td className="p-1.5 font-bold border-r border-slate-200">B{idx + 1}</td>
                          <td className="p-1">
                            <input type="text" placeholder="mm" value={matrix.rightHead[idx]} onChange={e => updateMatrix('rightHead', idx, e.target.value)} className="w-full text-center text-xs p-1 border border-slate-300 rounded font-semibold" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Malha complementar (opcional) */}
                <details className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <summary className="text-xs font-bold text-slate-700 cursor-pointer">
                    Pontos detalhados adicionais ({formData.ultrassomPoints.length} pontos)
                  </summary>
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={handleAddUltrassomPoint}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-700 text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Ponto</span>
                    </button>
                    {formData.ultrassomPoints.map((pt, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                        <input type="text" value={pt.pointId} onChange={e => handleUpdateUltrassomPoint(idx, 'pointId', e.target.value)} className="col-span-2 p-1 border rounded font-mono bg-white" />
                        <input type="text" value={pt.location} onChange={e => handleUpdateUltrassomPoint(idx, 'location', e.target.value)} className="col-span-4 p-1 border rounded bg-white" />
                        <input type="number" step="0.01" value={pt.measuredThickness} onChange={e => handleUpdateUltrassomPoint(idx, 'measuredThickness', parseFloat(e.target.value) || 0)} className="col-span-2 p-1 border rounded font-bold bg-white" />
                        <input type="number" step="0.01" value={pt.minAllowedThickness} onChange={e => handleUpdateUltrassomPoint(idx, 'minAllowedThickness', parseFloat(e.target.value) || 0)} className="col-span-2 p-1 border rounded bg-white" />
                        <span className={`col-span-1 text-[10px] font-bold text-center ${pt.status === 'CONFORME' ? 'text-emerald-700' : 'text-red-700'}`}>{pt.status === 'CONFORME' ? 'OK' : 'NC'}</span>
                        <button type="button" onClick={() => handleRemoveUltrassomPoint(idx)} className="col-span-1 text-red-500 flex justify-center cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              {/* Seção 7 (Dados Técnicos da Válvula puxados da Base) + Seção 8 (Em aberto para preenchimento manual) */}
              <div className="bg-fuchsia-50/50 p-4 rounded-xl border border-fuchsia-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-fuchsia-950 uppercase tracking-wider">
                    7. Dados Técnicos da Válvula (Puxados da Base)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {valvesForSelectedFarm.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={e => { if (e.target.value) handleSelectValveFromBase(e.target.value); }}
                        className="text-[11px] p-1 rounded border border-fuchsia-300 bg-white font-bold text-fuchsia-950"
                      >
                        <option value="">Puxar Válvula ({valvesForSelectedFarm.length})...</option>
                        {valvesForSelectedFarm.map(v => (
                          <option key={v.id} value={v.id}>{v.tag} ({v.code})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">TAG da Válvula</label>
                    <input type="text" value={sv.tag || ''} onChange={e => setFormData({ ...formData, safetyValveTechnical: { ...sv, tag: e.target.value } })} className="w-full p-1.5 border border-slate-300 rounded bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Fabricante / Modelo</label>
                    <input type="text" value={sv.manufacturer || ''} onChange={e => setFormData({ ...formData, safetyValveTechnical: { ...sv, manufacturer: e.target.value } })} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Set Point (Ajuste)</label>
                    <input type="text" value={sv.setPressure || ''} onChange={e => setFormData({ ...formData, safetyValveTechnical: { ...sv, setPressure: e.target.value } })} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nº Certificado PSV</label>
                    <input type="text" value={sv.certificateNumber || ''} onChange={e => setFormData({ ...formData, safetyValveTechnical: { ...sv, certificateNumber: e.target.value } })} className="w-full p-1.5 border border-slate-300 rounded bg-white font-mono" />
                  </div>
                </div>

                {/* Seção 8: Em aberto com lista suspensa abreviada */}
                <div className="pt-3 border-t border-fuchsia-200 space-y-2">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      8. Tipo e Descrição da(s) Inspeção(ões) Realizada(s) na Válvula
                    </h5>
                    <p className="text-[11px] text-amber-800">
                      Selecione para cada pergunta: <strong>C</strong> (Conforme), <strong>NC</strong> (Não Conforme) ou <strong>NA</strong> (Não Aplicável).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Inspeção visual</label>
                      <ComplianceDropdown
                        value={sv.visualInspection || ''}
                        onChange={val => setFormData({ ...formData, safetyValveTechnical: { ...sv, visualInspection: val } })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Calibração de válvula de segurança</label>
                      <ComplianceDropdown
                        value={sv.calibrationStatus || ''}
                        onChange={val => setFormData({ ...formData, safetyValveTechnical: { ...sv, calibrationStatus: val } })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Vazamento</label>
                      <ComplianceDropdown
                        value={sv.leakage || ''}
                        onChange={val => setFormData({ ...formData, safetyValveTechnical: { ...sv, leakage: val } })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 9: Verificação de Documentação (Em aberto com lista suspensa abreviada) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      9. Verificação de Documentação (Item 13.5.3.1 da NR-13)
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Selecione para cada pergunta: <strong>C</strong> (Conforme), <strong>NC</strong> (Não Conforme) ou <strong>NA</strong> (Não Aplicável).
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allC: NR13DocumentationCheck = {
                          completeAndUpToDate: 'C',
                          withinLegalDeadline: 'C',
                          dossierProntuario: 'C',
                          drawingDesenho: 'C',
                          occurrenceBook: 'C',
                          startupShutdownProcedure: 'C',
                          emergencyProcedure: 'C'
                        };
                        setFormData(prev => ({ ...prev, documentationCheck: allC }));
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 cursor-pointer"
                    >
                      Marcar todos C
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, documentationCheck: { ...EMPTY_DOC_CHECK } }))}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {([
                    ['completeAndUpToDate', 'Documentação completa e em dia'],
                    ['withinLegalDeadline', 'Inspeção dentro do prazo legal'],
                    ['dossierProntuario', 'Prontuário'],
                    ['drawingDesenho', 'Desenho'],
                    ['occurrenceBook', 'Livro de registro de ocorrência'],
                    ['startupShutdownProcedure', 'Procedimento de partida e parada'],
                    ['emergencyProcedure', 'Procedimento situações de emergência']
                  ] as Array<[keyof NR13DocumentationCheck, string]>).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">{label}</label>
                      <ComplianceDropdown
                        value={dc[key]}
                        onChange={val => updateDocCheck(key, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. FOTOS & ANEXOS RASTREÁVEIS (SEÇÕES 13–16) */}
          {activeFormSection === 'anexos' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Seção 13: Registro Fotográfico Adicional */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                      13. Registro Fotográfico da Inspeção (Páginas Finais do PDF)
                    </h4>
                    <p className="text-[11px] text-slate-500">Adicione fotos extras de placa de identificação, manômetro, dreno e válvula lacrada.</p>
                  </div>
                  <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Fotos</span>
                    <input type="file" accept="image/*" multiple onChange={handleExtraPhotoUpload} className="hidden" />
                  </label>
                </div>

                {(formData.photos && formData.photos.length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {formData.photos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-300 bg-white">
                        <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photos: formData.photos?.filter((_, i) => i !== idx) })}
                          className="absolute top-1 right-1 p-1 rounded bg-red-600 text-white text-[10px] opacity-90 hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Anexos Técnicos Oficiais (Itens 14, 15 e 16 do Relatório)
                </h3>
              </div>

              <AttachmentUploadField
                label="14. Anexo de Calibração do Calibrador de Válvula (PSV)"
                tag="LAUDO_VALVULA"
                description="Certificado de calibração da válvula de segurança vinculada ao vaso."
                attachment={formData.valveCalibrationAttachment}
                onAttachmentChange={att => setFormData({ ...formData, valveCalibrationAttachment: att })}
                onViewAttachment={att => setPreviewAttachment(att)}
              />

              <AttachmentUploadField
                label="15. Anexo de Calibração do Ultrassom"
                tag="LAUDO_ULTRASSOM"
                description="Certificado / laudo oficial de medição de espessura por ultrassom."
                attachment={formData.ultrassomAttachment}
                onAttachmentChange={att => setFormData({ ...formData, ultrassomAttachment: att })}
                onViewAttachment={att => setPreviewAttachment(att)}
              />

              <AttachmentUploadField
                label="16. Anexo de ART (Anotação de Responsabilidade Técnica)"
                tag="ART"
                description="Documento oficial da ART emitida pelo CREA e assinada pelo PH."
                attachment={formData.artAttachment}
                onAttachmentChange={att => setFormData({ ...formData, artAttachment: att })}
                onViewAttachment={att => setPreviewAttachment(att)}
              />
            </div>
          )}

          {/* 5. RECOMENDAÇÕES, CONCLUSÕES E PRÓXIMA INSPEÇÃO (SEÇÕES 10–12) */}
          {activeFormSection === 'parecer' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">10. Recomendações Técnicas</label>
                <textarea
                  rows={3}
                  value={formData.recommendations || ''}
                  onChange={e => setFormData({ ...formData, recommendations: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  placeholder="Recomendações operacionais, periodicidade de drenagem, substituição de componentes..."
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">11. Conclusões</h4>
                  <p className="text-[11px] text-amber-800">Em aberto para definição após a inspeção.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Parecer Geral</label>
                  <select
                    value={formData.technicalOpinion}
                    onChange={e => handleOpinionChange(e.target.value as NR13Opinion)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-extrabold text-slate-900 bg-white"
                  >
                    <option value="INCONCLUSIVO">-- Em aberto / A definir --</option>
                    <option value="FAVORAVEL">Conforme (Aprovado sem restrições)</option>
                    <option value="FAVORAVEL_COM_RESTRICOES">Liberado para operar com restrições (verificar recomendações)</option>
                    <option value="DESFAVORAVEL">Não conforme (Interdição / Ação imediata)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center space-x-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conc.conforme}
                      onChange={e => setFormData({
                        ...formData,
                        technicalOpinion: e.target.checked ? 'FAVORAVEL' : formData.technicalOpinion,
                        conclusionCheck: { ...conc, conforme: e.target.checked }
                      })}
                    />
                    <span className="font-bold text-emerald-800">Conforme: Sim</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conc.naoConforme}
                      onChange={e => setFormData({
                        ...formData,
                        technicalOpinion: e.target.checked ? 'DESFAVORAVEL' : formData.technicalOpinion,
                        conclusionCheck: { ...conc, naoConforme: e.target.checked }
                      })}
                    />
                    <span className="font-bold text-red-700">Não conforme: Sim</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conc.releasedWithRestrictions}
                      onChange={e => setFormData({
                        ...formData,
                        technicalOpinion: e.target.checked ? 'FAVORAVEL_COM_RESTRICOES' : formData.technicalOpinion,
                        conclusionCheck: { ...conc, releasedWithRestrictions: e.target.checked }
                      })}
                    />
                    <span className="font-bold text-amber-800">Liberado c/ restrições</span>
                  </label>
                </div>
              </div>

              {/* 12. Cronograma de Próxima Inspeção */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  12. Cronograma de Próxima Inspeção
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Próxima Inspeção Externa</label>
                    <input
                      type="date"
                      value={formData.nextInspections.nextExternalInspectionDate}
                      onChange={e => setFormData({
                        ...formData,
                        nextInspections: { ...formData.nextInspections, nextExternalInspectionDate: e.target.value }
                      })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Próxima Inspeção Interna</label>
                    <input
                      type="date"
                      value={formData.nextInspections.nextInternalInspectionDate}
                      onChange={e => setFormData({
                        ...formData,
                        nextInspections: { ...formData.nextInspections, nextInternalInspectionDate: e.target.value }
                      })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Teste Hidrostático / Complementar</label>
                    <input
                      type="date"
                      value={formData.nextInspections.nextComplementaryTestDate || ''}
                      onChange={e => setFormData({
                        ...formData,
                        nextInspections: { ...formData.nextInspections, nextComplementaryTestDate: e.target.value }
                      })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save & Close Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-fuchsia-900 hover:bg-fuchsia-800 text-white transition-all shadow-md cursor-pointer border border-fuchsia-400/30"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Laudo Técnico Oficial</span>
            </button>
          </div>
        </form>
      </div>

      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {showNewUltrassomModal && (
        <UltrassomEquipmentModal
          onClose={() => setShowNewUltrassomModal(false)}
          onSave={async (equip) => {
            await saveUltrassomEquipment(equip);
            setFormData(prev => ({
              ...prev,
              ultrassomEquipmentUsed: formatUltrassomEquipmentLabel(equip)
            }));
            setShowNewUltrassomModal(false);
          }}
        />
      )}
    </div>
  );
};
