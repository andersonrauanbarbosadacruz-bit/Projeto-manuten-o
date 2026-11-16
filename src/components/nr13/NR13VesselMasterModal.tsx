import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  Save,
  Building2,
  Gauge,
  ShieldCheck,
  Layers,
  ImagePlus,
  Trash2,
  Database
} from 'lucide-react';
import {
  Farm,
  FARMS,
  NR13Category,
  NR13UltrassomMatrix,
  NR13VesselMaster
} from '../../types';
import { FARM_COMPANY_PROFILES } from '../../data/nr13InitialData';
import { useApp } from '../../context/AppContext';
import { compressImage } from '../../utils/imageCompressor';

interface NR13VesselMasterModalProps {
  vessel?: NR13VesselMaster | null;
  currentFarmFilter?: Farm | 'TODAS';
  onSave: (vessel: NR13VesselMaster) => void;
  onClose: () => void;
  isDedicatedScreen?: boolean;
}

const EMPTY_MATRIX: NR13UltrassomMatrix = {
  body: ['', '', '', ''],
  leftHead: ['', '', '', ''],
  rightHead: ['', '', '', '']
};

export const NR13VesselMasterModal: React.FC<NR13VesselMasterModalProps> = ({
  vessel,
  currentFarmFilter,
  onSave,
  onClose,
  isDedicatedScreen = false
}) => {
  const { valveCalibrations } = useApp();
  const [section, setSection] = useState<'basico' | 'tecnico' | 'dispositivos' | 'espessuras'>('basico');

  const initialFarm: Farm =
    vessel?.farm ||
    (currentFarmFilter && currentFarmFilter !== 'TODAS' ? currentFarmFilter : 'Vale das Uvas');

  const [formData, setFormData] = useState<NR13VesselMaster>(() => {
    if (vessel) {
      return JSON.parse(JSON.stringify(vessel));
    }
    return {
      id: `vessel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      farm: initialFarm,
      assetType: 'VP',
      vesselNumber: '',
      equipmentTag: '',
      sector: 'Sala de Máquinas',
      companyData: { ...FARM_COMPANY_PROFILES[initialFarm] },
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
        vesselType: 'Vertical Cilíndrico',
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
        local: initialFarm,
        area: 'Sala de Máquinas',
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
      linkedValveTag: '',
      linkedValveSpecs: {},
      linkedGaugeTag: '',
      linkedGaugeSpecs: {},
      defaultUltrassomMatrix: { ...EMPTY_MATRIX },
      equipmentPhoto: '',
      notes: '',
      createdAt: new Date().toISOString()
    };
  });

  const farmValves = useMemo(
    () => (valveCalibrations || []).filter(v => v.farm === formData.farm),
    [valveCalibrations, formData.farm]
  );

  const handleFarmChange = (newFarm: Farm) => {
    setFormData(prev => ({
      ...prev,
      farm: newFarm,
      companyData: { ...FARM_COMPANY_PROFILES[newFarm] },
      equipment: {
        ...prev.equipment,
        local: newFarm
      }
    }));
  };

  const recalcNR13 = (pmtaVal: number, volVal: number, volUnit: 'L' | 'm³') => {
    const pressMpa = Number((pmtaVal * 0.0980665).toFixed(2));
    const volM3 = Number((volUnit === 'm³' ? volVal : volVal / 1000).toFixed(3));
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
        geometricVolume: volVal,
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

  const handleSelectValve = (tag: string) => {
    const matched = (valveCalibrations || []).find(v => v.tag === tag && v.farm === formData.farm) ||
      (valveCalibrations || []).find(v => v.tag === tag);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        linkedValveTag: matched.tag,
        linkedValveSpecs: {
          tag: matched.tag,
          manufacturer: matched.manufacturer,
          model: matched.model,
          connectionSize: matched.connectionSize,
          fluidType: matched.fluidType,
          setPressure: `${matched.setPressure} ${matched.pressureUnit}`,
          openingPressure: `${matched.openingPressure} ${matched.pressureUnit}`,
          reseatPressure: matched.reseatPressure ? `${matched.reseatPressure} ${matched.pressureUnit}` : undefined,
          certificateNumber: matched.code,
          calibrationDate: matched.calibrationDate,
          nextCalibrationDate: matched.nextCalibrationDate,
          visualInspection: matched.status === 'APROVADA' ? 'Conforme' : 'Verificar',
          calibrationStatus: matched.status === 'APROVADA' ? 'Aprovada / Calibrada' : matched.status,
          leakage: matched.tightnessTest === 'SEM_VAZAMENTO' ? 'Sem vazamento' : 'Com vazamento'
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, linkedValveTag: tag }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 960, 720, 0.72);
    if (compressed) {
      setFormData(prev => ({ ...prev, equipmentPhoto: compressed }));
    }
  };

  const updateMatrix = (key: 'body' | 'leftHead' | 'rightHead', idx: number, value: string) => {
    setFormData(prev => {
      const current = prev.defaultUltrassomMatrix || { ...EMPTY_MATRIX };
      const arr = [...current[key]] as [string, string, string, string];
      arr[idx] = value;
      return {
        ...prev,
        defaultUltrassomMatrix: {
          ...current,
          [key]: arr
        }
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: NR13VesselMaster = {
      ...formData,
      vesselNumber: formData.vesselNumber.trim() || formData.equipmentTag.split(' ')[0] || 'VP-01',
      equipmentTag: formData.equipmentTag.trim() || formData.vesselNumber.trim(),
      updatedAt: new Date().toISOString()
    };
    onSave(cleaned);
  };

  const matrix = formData.defaultUltrassomMatrix || EMPTY_MATRIX;

  return (
    <div className={
      isDedicatedScreen
        ? 'max-w-5xl mx-auto pb-16 space-y-4 animate-in fade-in duration-150'
        : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150'
    }>
      <div className={
        isDedicatedScreen
          ? 'bg-white rounded-2xl shadow-lg w-full flex flex-col border border-slate-200 overflow-hidden'
          : 'bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-300 overflow-hidden'
      }>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-fuchsia-950 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-400 text-emerald-950 uppercase tracking-wider">
                Cadastro Fixo de VP / CP NR-13
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">
                {vessel ? `Editar ${vessel.assetType === 'CP' ? 'CP' : 'VP'}: ${vessel.vesselNumber}` : 'Cadastrar Novo VP (Vaso) ou CP (Compressor)'}
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

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSection('basico')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              section === 'basico' ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-slate-300' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Fazenda, Empresa & Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('tecnico')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              section === 'tecnico' ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-slate-300' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>2. Dados Técnicos & NR-13</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('dispositivos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              section === 'dispositivos' ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-slate-300' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Válvula PSV Fixa</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('espessuras')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              section === 'espessuras' ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-slate-300' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. Espessuras Padrão (P1–P4 / B1–B4)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={isDedicatedScreen ? 'p-4 sm:p-6 space-y-5' : 'flex-1 overflow-y-auto p-5 space-y-5'}>
          {section === 'basico' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Cadastro *</label>
                  <select
                    value={formData.assetType || 'VP'}
                    onChange={e => setFormData({
                      ...formData,
                      assetType: e.target.value as 'VP' | 'CP',
                      equipment: {
                        ...formData.equipment,
                        equipmentType: e.target.value === 'CP' ? 'Compressor / Reservatório' : 'Vaso de Pressão'
                      }
                    })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-fuchsia-950"
                  >
                    <option value="VP">VP - Vaso de Pressão</option>
                    <option value="CP">CP - Compressor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fazenda *</label>
                  <select
                    value={formData.farm}
                    onChange={e => handleFarmChange(e.target.value as Farm)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                  >
                    {FARMS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número do VP / CP *</label>
                  <input
                    type="text"
                    required
                    value={formData.vesselNumber}
                    onChange={e => setFormData({ ...formData, vesselNumber: e.target.value })}
                    placeholder="Ex: VP-01, CP-01, ACUM-02"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold font-mono text-fuchsia-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Setor / Área *</label>
                  <input
                    type="text"
                    required
                    value={formData.sector}
                    onChange={e => setFormData({
                      ...formData,
                      sector: e.target.value,
                      equipment: { ...formData.equipment, area: e.target.value }
                    })}
                    placeholder="Ex: Sala de Máquinas"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Identificação / TAG Completa *</label>
                <input
                  type="text"
                  required
                  value={formData.equipmentTag}
                  onChange={e => setFormData({ ...formData, equipmentTag: e.target.value })}
                  placeholder="Ex: VP-01 - Reservatório de Ar Comprimido Schulz"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              {/* Dados da Empresa (Seção 2 do PDF) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  2. Dados da Empresa (Puxados no PDF)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Razão Social</label>
                    <input
                      type="text"
                      value={formData.companyData.razaoSocial}
                      onChange={e => setFormData({ ...formData, companyData: { ...formData.companyData, razaoSocial: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={formData.companyData.cnpj}
                      onChange={e => setFormData({ ...formData, companyData: { ...formData.companyData, cnpj: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formData.companyData.address}
                      onChange={e => setFormData({ ...formData, companyData: { ...formData.companyData, address: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cidade / UF</label>
                    <input
                      type="text"
                      value={formData.companyData.cityState}
                      onChange={e => setFormData({ ...formData, companyData: { ...formData.companyData, cityState: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.companyData.cep}
                      onChange={e => setFormData({ ...formData, companyData: { ...formData.companyData, cep: e.target.value } })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Foto do Equipamento (Capa) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase">Foto Padrão do Equipamento (Capa do Laudo)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aparece na Página 1 (&quot;IMAGEM DO EQUIPAMENTO&quot;) automaticamente ao gerar novos laudos.
                  </p>
                  <label className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{formData.equipmentPhoto ? 'Trocar Foto' : 'Carregar Foto do Vaso'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {formData.equipmentPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, equipmentPhoto: '' })}
                      className="ml-2 inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
                {formData.equipmentPhoto ? (
                  <img
                    src={formData.equipmentPhoto}
                    alt="Foto do vaso"
                    className="h-24 w-32 object-cover rounded-lg border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="h-24 w-32 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-[11px] text-slate-400">
                    Sem foto
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'tecnico' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fabricante</label>
                  <input type="text" value={formData.equipment.manufacturer} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, manufacturer: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Modelo</label>
                  <input type="text" value={formData.equipment.model} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, model: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº de Série</label>
                  <input type="text" value={formData.equipment.serialNumber} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, serialNumber: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ano de Fabricação</label>
                  <input type="text" value={formData.equipment.manufactureYear} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, manufactureYear: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">PTH</label>
                  <input type="text" value={formData.equipment.pth || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, pth: e.target.value } })} placeholder="Ex: 18.75 kgf/cm²" className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">PMTA (kgf/cm²)</label>
                  <input type="number" step="0.01" value={formData.equipment.pmta} onChange={e => recalcNR13(parseFloat(e.target.value) || 0, formData.equipment.geometricVolume, formData.equipment.volumeUnit)} className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold" />
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Volume</label>
                  <div className="flex space-x-1">
                    <input type="number" step="0.01" value={formData.equipment.geometricVolume} onChange={e => recalcNR13(formData.equipment.pmta, parseFloat(e.target.value) || 0, formData.equipment.volumeUnit)} className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold" />
                    <select value={formData.equipment.volumeUnit} onChange={e => recalcNR13(formData.equipment.pmta, formData.equipment.geometricVolume, e.target.value as 'L' | 'm³')} className="text-xs p-2 rounded-lg border border-slate-300 font-bold">
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Material Fabricação</label>
                  <input type="text" value={formData.equipment.material} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, material: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Temperatura de Projeto</label>
                  <input type="text" value={formData.equipment.designTemperature} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, designTemperature: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Temperatura de Trabalho</label>
                  <input type="text" value={formData.equipment.operatingTemperature || ''} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, operatingTemperature: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fluido de Trabalho</label>
                  <input type="text" value={formData.equipment.serviceFluid} onChange={e => setFormData({ ...formData, equipment: { ...formData.equipment, serviceFluid: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                </div>
              </div>

              <div className="bg-fuchsia-50 p-3.5 rounded-xl border border-fuchsia-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Classe do Fluido</label>
                  <select value={formData.nr13Categorization.fluidClass} onChange={e => setFormData({ ...formData, nr13Categorization: { ...formData.nr13Categorization, fluidClass: e.target.value as any } })} className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold">
                    <option value="A">Classe A (Tóxico / Inflamável)</option>
                    <option value="B">Classe B (Combustível)</option>
                    <option value="C">Classe C (Vapor / Ar Comprimido)</option>
                    <option value="D">Classe D (Outros)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Grupo Potencial de Risco</label>
                  <input type="text" value={formData.nr13Categorization.riskGroup || ''} onChange={e => setFormData({ ...formData, nr13Categorization: { ...formData.nr13Categorization, riskGroup: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold" />
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Categoria NR-13</span>
                  <strong className="text-sm font-black text-fuchsia-950">CATEGORIA {formData.nr13Categorization.category} (P×V = {formData.nr13Categorization.pvProduct})</strong>
                </div>
              </div>
            </div>
          )}

          {section === 'dispositivos' && (
            <div className="space-y-5">
              {/* Válvula Vinculada */}
              <div className="bg-fuchsia-50/50 p-4 rounded-xl border border-fuchsia-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-fuchsia-950 uppercase">7. Válvula de Segurança Vinculada ao Vaso</h4>
                  <select
                    value={formData.linkedValveTag || ''}
                    onChange={e => handleSelectValve(e.target.value)}
                    className="text-xs p-1.5 rounded-lg border border-fuchsia-300 bg-white font-bold text-fuchsia-950"
                  >
                    <option value="">-- Puxar de Calibração Cadastrada ({farmValves.length}) --</option>
                    {farmValves.map(v => (
                      <option key={v.id} value={v.tag}>{v.tag} • {v.manufacturer} ({v.setPressure} {v.pressureUnit})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">TAG Válvula</label>
                    <input type="text" value={formData.linkedValveSpecs?.tag || formData.linkedValveTag || ''} onChange={e => setFormData({ ...formData, linkedValveTag: e.target.value, linkedValveSpecs: { ...(formData.linkedValveSpecs || {}), tag: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Fabricante</label>
                    <input type="text" value={formData.linkedValveSpecs?.manufacturer || ''} onChange={e => setFormData({ ...formData, linkedValveSpecs: { ...(formData.linkedValveSpecs || {}), manufacturer: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Modelo / Conexão</label>
                    <input type="text" value={formData.linkedValveSpecs?.model || ''} onChange={e => setFormData({ ...formData, linkedValveSpecs: { ...(formData.linkedValveSpecs || {}), model: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pressão Ajuste (Set Point)</label>
                    <input type="text" value={formData.linkedValveSpecs?.setPressure || ''} onChange={e => setFormData({ ...formData, linkedValveSpecs: { ...(formData.linkedValveSpecs || {}), setPressure: e.target.value } })} className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'espessuras' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Valores base de referência para a tabela padrão de ultrassom (P1–P4 no Corpo, B1–B4 no Tampo Esquerdo e Tampo Direito). Serão sugeridos automaticamente ao abrir um novo laudo para este vaso.
              </p>
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
                      <th className="p-1.5 border-r border-slate-300">MEDIDA (mm)</th>
                      <th className="p-1.5 border-r border-slate-200">PONTO</th>
                      <th className="p-1.5 border-r border-slate-300">MEDIDA (mm)</th>
                      <th className="p-1.5 border-r border-slate-200">PONTO</th>
                      <th className="p-1.5">MEDIDA (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[0, 1, 2, 3].map(idx => (
                      <tr key={idx}>
                        <td className="p-2 font-bold border-r border-slate-200">P{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-300">
                          <input type="text" value={matrix.body[idx]} onChange={e => updateMatrix('body', idx, e.target.value)} placeholder="mm" className="w-full text-center text-xs p-1 border border-slate-300 rounded" />
                        </td>
                        <td className="p-2 font-bold border-r border-slate-200">B{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-300">
                          <input type="text" value={matrix.leftHead[idx]} onChange={e => updateMatrix('leftHead', idx, e.target.value)} placeholder="mm" className="w-full text-center text-xs p-1 border border-slate-300 rounded" />
                        </td>
                        <td className="p-2 font-bold border-r border-slate-200">B{idx + 1}</td>
                        <td className="p-1.5">
                          <input type="text" value={matrix.rightHead[idx]} onChange={e => updateMatrix('rightHead', idx, e.target.value)} placeholder="mm" className="w-full text-center text-xs p-1 border border-slate-300 rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Vaso na Base</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
