import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft,
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Paperclip, 
  Calendar,
  Building,
  User,
  Gauge,
  Activity,
  Layers,
  Eye
} from 'lucide-react';
import { DocumentAttachment, NR13InspectionReport } from '../../types';
import { exportNR13ReportToPdf } from '../../utils/nr13PdfGenerator';
import { downloadAttachment, formatFileSize } from '../../utils/fileAttachmentHelper';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface NR13ReportDetailModalProps {
  report: NR13InspectionReport;
  onClose: () => void;
  onEdit?: () => void;
  isDedicatedScreen?: boolean;
}

export const NR13ReportDetailModal: React.FC<NR13ReportDetailModalProps> = ({
  report,
  onClose,
  onEdit,
  isDedicatedScreen = false
}) => {
  const [selectedAttachment, setSelectedAttachment] = useState<DocumentAttachment | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportNR13ReportToPdf(report);
    } catch (err) {
      console.error('Falha ao exportar PDF NR-13:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={
      isDedicatedScreen
        ? 'max-w-5xl mx-auto pb-16 space-y-4 animate-in fade-in duration-150 print:p-0 print:bg-white'
        : 'fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col justify-between overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-150'
    }>
      {/* Top Control Bar */}
      <div className={
        isDedicatedScreen
          ? 'bg-slate-900 text-white rounded-2xl border border-slate-700 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg no-print'
          : 'sticky top-0 z-20 bg-slate-900 text-white border-b border-slate-700 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl print:hidden'
      }>
        <div className="flex items-center space-x-3 overflow-hidden min-w-0">
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
            className="h-8 w-auto object-contain shrink-0 bg-white/10 px-2 py-0.5 rounded-md" 
          />
          <div className="border-l border-slate-700 pl-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-fuchsia-200 text-fuchsia-950 uppercase tracking-wider">
                NR-13 Laudo Oficial
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {report.code}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-lg">
              {report.equipmentTag} • {report.farm}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-600 cursor-pointer"
            >
              Editar
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-600 cursor-pointer"
            title="Imprimir laudo em tela completa"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-900 hover:bg-fuchsia-800 text-white transition-all shadow-md cursor-pointer border border-fuchsia-500/30"
            title="Baixar Laudo Técnico Oficial em PDF com logo el Ciruelo"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Gerando...' : 'Baixar PDF Oficial'}</span>
          </button>

          {!isDedicatedScreen && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar laudo"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Main Fullscreen Report Paper */}
      <div className={
        isDedicatedScreen
          ? 'w-full bg-white shadow-lg rounded-2xl border border-slate-200 p-5 sm:p-10 text-slate-900 print:m-0 print:p-0 print:border-none print:shadow-none'
          : 'flex-1 max-w-5xl w-full mx-auto my-4 sm:my-8 bg-white shadow-2xl rounded-2xl border border-slate-200 p-6 sm:p-10 text-slate-900 print:m-0 print:p-0 print:border-none print:shadow-none'
      }>
        
        {/* Header Document Banner */}
        <div className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 text-white rounded-xl p-6 mb-8 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm">
                <img 
                  src="/assets/aistudio/image_adab39d7.png" 
                  alt="el Ciruelo" 
                  className="h-10 w-auto object-contain" 
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-fuchsia-300 uppercase tracking-widest">
                  Gestão de Segurança e Integridade Operacional
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  RELATÓRIO TÉCNICO DE INSPEÇÃO DE VASO DE PRESSÃO – NR-13
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Documento-base Oficial • Norma Regulamentadora NR-13 • Portaria MTP nº 1.847
                </p>
              </div>
            </div>

            <div className="text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-end">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                report.technicalOpinion === 'FAVORAVEL'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : report.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : report.technicalOpinion === 'INCONCLUSIVO'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-red-500 text-white shadow-xs'
              }`}>
                {report.technicalOpinion === 'FAVORAVEL'
                  ? 'Parecer: Conforme'
                  : report.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                  ? 'Liberado c/ Restrições'
                  : report.technicalOpinion === 'INCONCLUSIVO'
                  ? 'Parecer: Em Aberto'
                  : 'Não Conforme'}
              </span>
              <span className="text-xs text-slate-300 font-mono mt-1">
                {report.code}
              </span>
            </div>
          </div>
        </div>

        {/* Cover Photo (Imagem do Equipamento) */}
        {(report.equipmentPhoto || report.photos?.[0]) && (
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
              Imagem do Equipamento
            </span>
            <img
              src={report.equipmentPhoto || report.photos![0]}
              alt={report.equipmentTag}
              className="max-h-60 w-auto object-contain rounded-lg border border-slate-300 shadow-xs"
            />
          </div>
        )}

        {/* Identification Summary Table */}
        <div className="mb-8 border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-700 flex justify-between">
            <span>Identificação do Documento &amp; Equipamento</span>
            <span>NR-13 Revisão 00</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-3.5 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Relatório N.º:</span>
                <strong className="text-slate-900 font-mono">{report.code}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Vaso N.º / TAG:</span>
                <strong className="text-slate-900">{report.vesselNumber ? `${report.vesselNumber} • ` : ''}{report.equipmentTag}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Unidade / Fazenda:</span>
                <strong className="text-emerald-800">{report.farm}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Setor / Área:</span>
                <strong className="text-slate-900">{report.sector}</strong>
              </div>
            </div>

            <div className="p-3.5 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tipo de Inspeção:</span>
                <span className="px-2 py-0.5 rounded font-extrabold text-[11px] bg-slate-200 text-slate-800">
                  {report.inspectionNature}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Início / Término:</span>
                <strong className="text-slate-900">
                  {report.inspectionDate ? new Date(report.inspectionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                  {report.inspectionEndDate && report.inspectionEndDate !== report.inspectionDate
                    ? ` a ${new Date(report.inspectionEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                    : ''}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Responsável Técnico (PH):</span>
                <strong className="text-slate-900">{report.technicalResponsible}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">CREA / ART N.º:</span>
                <strong className="text-fuchsia-950">{report.creaNumber} • {report.artNumber}</strong>
              </div>
            </div>
          </div>

          {report.companyData && (
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500">Razão Social: </span>
                <strong className="text-slate-900">{report.companyData.razaoSocial || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500">CNPJ: </span>
                <strong className="text-slate-900 font-mono">{report.companyData.cnpj || 'Em aberto'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Endereço: </span>
                <strong className="text-slate-900">{report.companyData.address || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Cidade/UF: </span>
                <strong className="text-slate-900">{report.companyData.cityState || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500">CEP: </span>
                <strong className="text-slate-900 font-mono">{report.companyData.cep || '-'}</strong>
              </div>
            </div>
          )}
        </div>

        {/* 1. Finalidade e Escopo */}
        <section className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>1. Finalidade e Escopo dos Exames</span>
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Atividade / Exame</th>
                  <th className="p-2.5 text-center">Realizado?</th>
                  <th className="p-2.5">Método / Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Inspeção visual externa</td>
                  <td className="p-2.5 text-center font-bold text-emerald-700">
                    {report.scope.externalVisual.performed ? 'SIM' : 'NÃO'}
                  </td>
                  <td className="p-2.5 text-slate-600">{report.scope.externalVisual.note || 'Superfície e pintura'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Inspeção visual interna</td>
                  <td className="p-2.5 text-center font-bold text-slate-700">
                    {report.scope.internalVisual.performed === true ? 'SIM' : report.scope.internalVisual.performed === 'NA' ? 'N/A' : 'NÃO'}
                  </td>
                  <td className="p-2.5 text-slate-600">{report.scope.internalVisual.note || 'Acesso pela boca de visita'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Medição de espessura por ultrassom</td>
                  <td className="p-2.5 text-center font-bold text-emerald-700">
                    {report.scope.ultrassom.performed ? 'SIM' : 'NÃO'}
                  </td>
                  <td className="p-2.5 text-slate-600">{report.scope.ultrassom.note || 'Malha de pontos no costado e tampos'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Verificação dos dispositivos de segurança</td>
                  <td className="p-2.5 text-center font-bold text-emerald-700">
                    {report.scope.safetyDevices.performed ? 'SIM' : 'NÃO'}
                  </td>
                  <td className="p-2.5 text-slate-600">{report.scope.safetyDevices.note || 'Válvula PSV calibrada'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Análise documental</td>
                  <td className="p-2.5 text-center font-bold text-emerald-700">
                    {report.scope.documentAnalysis.performed ? 'SIM' : 'NÃO'}
                  </td>
                  <td className="p-2.5 text-slate-600">{report.scope.documentAnalysis.note || 'Prontuário e Livro de Registro'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Identificação das Partes */}
        <section className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>2. Identificação das Partes</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Proprietário / Estabelecimento:</span>
              <strong className="text-slate-900">{report.parties.owner}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Empresa Inspetora / Contratante:</span>
              <strong className="text-slate-900">{report.parties.inspectionCompany} • {report.parties.contractor}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Profissional Habilitado (PH):</span>
              <strong className="text-slate-900">{report.technicalResponsible} ({report.creaNumber})</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Acompanhante da Inspeção na Fazenda:</span>
              <strong className="text-slate-900">{report.parties.inspectionCompanion}</strong>
            </div>
          </div>
        </section>

        {/* 3. Dados Técnicos do Vaso & 4. Determinação da Categoria */}
        <section className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-600" />
            <span>3. Dados Técnicos do Vaso &amp; 4. Categoria NR-13</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-3">
            {[
              ['Fabricante', report.equipment.manufacturer],
              ['Modelo', report.equipment.model],
              ['Nº de Série', report.equipment.serialNumber],
              ['Ano de Fabricação', report.equipment.manufactureYear],
              ['PTH', report.equipment.pth],
              ['PMTA', report.equipment.pmta ? `${report.equipment.pmta} kgf/cm²` : '-'],
              ['Pressão Máx. Operação', report.equipment.maxOperatingPressure || (report.equipment.normalOperatingPressure ? `${report.equipment.normalOperatingPressure} kgf/cm²` : '-')],
              ['Tipo Equipamento', report.equipment.equipmentType],
              ['Volume', `${report.equipment.geometricVolume || 0} ${report.equipment.volumeUnit}`],
              ['Norma do Projeto', `${report.equipment.projectCode}${report.equipment.designCodeEdition ? ` (Ed. ${report.equipment.designCodeEdition})` : ''}`],
              ['Finalidade do Vaso', report.equipment.vesselPurpose],
              ['Tipo de Vaso', report.equipment.vesselType],
              ['Diâmetro Externo', report.equipment.outerDiameter],
              ['Comprimento', report.equipment.length],
              ['Tara', report.equipment.tareWeight],
              ['Material Fabricação', report.equipment.material],
              ['Espessura do Corpo', report.equipment.bodyThickness],
              ['Espessura da Calota', report.equipment.headThickness],
              ['Calota (Inf. Esquerdo)', report.equipment.headBottomLeft],
              ['Calota (Sup. Direito)', report.equipment.headTopRight],
              ['Espessura Mín. Corpo', report.equipment.minBodyThickness],
              ['Espessura Mín. Calota', report.equipment.minHeadThickness],
              ['Altura / Largura', `${report.equipment.height || '-'} / ${report.equipment.width || '-'}`],
              ['Temp. Projeto / Trabalho', `${report.equipment.designTemperature || '-'} / ${report.equipment.operatingTemperature || '-'}`]
            ].map(([label, val], idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">{label}:</span>
                <strong className="text-slate-900 text-xs break-words">{val || '-'}</strong>
              </div>
            ))}
          </div>

          {/* NR-13 Category Callout Card */}
          <div className="p-4 bg-fuchsia-50/70 border border-fuchsia-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-extrabold text-fuchsia-900 uppercase tracking-widest block">
                4. Determinação da Categoria Conforme NR-13
              </span>
              <p className="text-slate-700 mt-0.5">
                Fluido: <strong>{report.equipment.serviceFluid}</strong> • Classe: <strong>Classe {report.nr13Categorization.fluidClass}</strong> • P = <strong>{report.nr13Categorization.pressureMpa} MPa</strong> • V = <strong>{report.nr13Categorization.volumeM3} m³</strong> • P×V = <strong>{report.nr13Categorization.pvProduct} MPa·m³</strong>
              </p>
              {report.nr13Categorization.riskGroup && (
                <p className="text-[11px] font-bold text-fuchsia-950 mt-0.5">
                  Grupo Potencial de Risco: {report.nr13Categorization.riskGroup}
                </p>
              )}
            </div>
            <div className="px-4 py-2 bg-fuchsia-900 text-white rounded-lg font-black text-sm uppercase tracking-wider shrink-0 shadow-xs">
              CATEGORIA {report.nr13Categorization.category}
            </div>
          </div>
        </section>

        {/* 5. Inspeções Realizadas no Vaso */}
        {report.vesselChecklist && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>5. Tipo e Descrição das Inspeções Realizadas no Vaso</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {([
                ['Inspeção visual', report.vesselChecklist.visualInspection],
                ['Medição de espessura', report.vesselChecklist.thicknessMeasurement],
                ['Calibração de válvula de segurança', report.vesselChecklist.safetyValveCalibration],
                ['Vazamento', report.vesselChecklist.leakage],
                ['Instalação de adesivo', report.vesselChecklist.stickerInstallation],
                ['Adesivo com informações de fábrica', report.vesselChecklist.factoryInfoSticker],
                ['Local de fácil acesso', report.vesselChecklist.easyAccess],
                ['Local confinado', report.vesselChecklist.confinedSpace],
                ['Iluminação de emergência', report.vesselChecklist.emergencyLighting],
                ['O vaso de pressão funciona normalmente', report.vesselChecklist.operatesNormally],
                ['Satisfaz condições de segurança da NR-13', report.vesselChecklist.meetsAllNR13],
                ['Confere com o Prontuário', report.vesselChecklist.matchesDossier],
                ['Anomalia que prejudica segurança', report.vesselChecklist.anomalyFound],
                ['Possui manômetro', report.vesselChecklist.hasPressureGauge],
                ['Possui válvula de segurança', report.vesselChecklist.hasSafetyValve],
                ['Número de identificação', report.vesselChecklist.identificationNumber]
              ] as Array<[string, string]>).map(([label, val], idx) => {
                const badge =
                  val === 'C' ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[11px] shrink-0">C • Conforme</span>
                  ) : val === 'NC' ? (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-extrabold text-[11px] shrink-0">NC • Não Conforme</span>
                  ) : val === 'NA' ? (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-extrabold text-[11px] shrink-0">NA • N/A</span>
                  ) : (
                    <strong className="text-slate-900 text-right">{val || '—'}</strong>
                  );
                return (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">{label}:</span>
                    {badge}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7 & 8. Dados Técnicos da Válvula e Inspeções na Válvula */}
        <section className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>7 &amp; 8. Dados Técnicos da Válvula e Inspeções Realizadas</span>
          </h3>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-slate-900">7. Válvula de Segurança (PSV)</strong>
              {report.safetyValveTechnical?.tag && (
                <span className="px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-950 font-mono font-bold text-[10px]">
                  {report.safetyValveTechnical.tag}
                </span>
              )}
            </div>
            {report.safetyValveTechnical ? (
              <div className="text-[11px] text-slate-700 space-y-0.5">
                <p>Fabricante/Modelo: <strong>{report.safetyValveTechnical.manufacturer || '-'} {report.safetyValveTechnical.model || ''}</strong> • Conexão: <strong>{report.safetyValveTechnical.connectionSize || '-'}</strong></p>
                <p>Pressão Ajuste: <strong>{report.safetyValveTechnical.setPressure || '-'}</strong> • Abertura: <strong>{report.safetyValveTechnical.openingPressure || '-'}</strong></p>
                <p>Certificado: <strong className="font-mono">{report.safetyValveTechnical.certificateNumber || '-'}</strong></p>
                <div className="pt-1.5 mt-1.5 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">8. Inspeções na Válvula:</span>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                    <span>Visual: <strong className={report.safetyValveTechnical.visualInspection === 'C' ? 'text-emerald-700' : report.safetyValveTechnical.visualInspection === 'NC' ? 'text-red-700' : 'text-slate-900'}>{report.safetyValveTechnical.visualInspection || '—'}</strong></span>
                    <span>• Calibração: <strong className={report.safetyValveTechnical.calibrationStatus === 'C' ? 'text-emerald-700' : report.safetyValveTechnical.calibrationStatus === 'NC' ? 'text-red-700' : 'text-slate-900'}>{report.safetyValveTechnical.calibrationStatus || '—'}</strong></span>
                    <span>• Vazamento: <strong className={report.safetyValveTechnical.leakage === 'C' ? 'text-emerald-700' : report.safetyValveTechnical.leakage === 'NC' ? 'text-red-700' : 'text-slate-900'}>{report.safetyValveTechnical.leakage || '—'}</strong></span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-600">{report.devicesVerification.safetyValveNotes || '—'}</p>
            )}
          </div>
        </section>

        {/* 9. Verificação de Documentação */}
        {report.documentationCheck && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              <span>9. Verificação de Documentação (Item 13.5.3.1 da NR-13)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {([
                ['Documentação completa e em dia', report.documentationCheck.completeAndUpToDate],
                ['Inspeção dentro do prazo legal', report.documentationCheck.withinLegalDeadline],
                ['Prontuário', report.documentationCheck.dossierProntuario],
                ['Desenho', report.documentationCheck.drawingDesenho],
                ['Livro de registro de ocorrência', report.documentationCheck.occurrenceBook],
                ['Procedimento de partida e parada', report.documentationCheck.startupShutdownProcedure],
                ['Procedimento para situações de emergência', report.documentationCheck.emergencyProcedure]
              ] as Array<[string, string]>).map(([label, val], idx) => {
                const badge =
                  val === 'C' ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[11px] shrink-0">C • Conforme</span>
                  ) : val === 'NC' ? (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-extrabold text-[11px] shrink-0">NC • Não Conforme</span>
                  ) : val === 'NA' ? (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-extrabold text-[11px] shrink-0">NA • N/A</span>
                  ) : (
                    <strong className="text-slate-900">{val || '—'}</strong>
                  );
                return (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">{label}:</span>
                    {badge}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Matriz Padrão de Ultrassom + Mapa */}
        {report.ultrassomMatrix && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Tabela Padrão de Espessuras (Corpo P1–P4 &amp; Tampos B1–B4)</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <div className="lg:col-span-2 border border-slate-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-center">
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
                        <td className="p-2 font-bold border-r border-slate-200">P{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold">{report.ultrassomMatrix!.body[idx] || '-'}</td>
                        <td className="p-2 font-bold border-r border-slate-200">B{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold">{report.ultrassomMatrix!.leftHead[idx] || '-'}</td>
                        <td className="p-2 font-bold border-r border-slate-200">B{idx + 1}</td>
                        <td className="p-2 font-semibold">{report.ultrassomMatrix!.rightHead[idx] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-2">Mapa de Pontos</span>
                <svg viewBox="0 0 240 70" className="w-full max-w-[230px]">
                  <rect x="10" y="10" width="145" height="50" rx="16" fill="#fff" stroke="#0f172a" strokeWidth="2" />
                  <text x="28" y="25" fontSize="10" fill="#0f172a" fontWeight="bold">P1</text>
                  <text x="125" y="25" fontSize="10" fill="#0f172a" fontWeight="bold">P2</text>
                  <text x="28" y="50" fontSize="10" fill="#b91c1c" fontWeight="bold">P3</text>
                  <text x="125" y="50" fontSize="10" fill="#b91c1c" fontWeight="bold">P4</text>
                  <circle cx="200" cy="35" r="24" fill="#fff" stroke="#0f172a" strokeWidth="2" />
                  <text x="184" y="30" fontSize="9" fill="#0f172a" fontWeight="bold">B1</text>
                  <text x="206" y="30" fontSize="9" fill="#0f172a" fontWeight="bold">B2</text>
                  <text x="184" y="47" fontSize="9" fill="#b91c1c" fontWeight="bold">B3</text>
                  <text x="206" y="47" fontSize="9" fill="#b91c1c" fontWeight="bold">B4</text>
                </svg>
              </div>
            </div>
          </section>
        )}

        {/* 9. Exames por Ultrassom (Tabela de pontos) */}
        {report.ultrassomPoints && report.ultrassomPoints.length > 0 && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>9. Medição de Espessura por Ultrassom (Malha de Pontos)</span>
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Ponto</th>
                    <th className="p-2.5">Localização no Vaso</th>
                    <th className="p-2.5 text-right">Espessura Medida</th>
                    <th className="p-2.5 text-right">Espessura Mínima</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.ultrassomPoints.map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold font-mono text-slate-900">{pt.pointId}</td>
                      <td className="p-2.5 text-slate-700">{pt.location}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{pt.measuredThickness.toFixed(2)} mm</td>
                      <td className="p-2.5 text-right text-slate-500">{pt.minAllowedThickness.toFixed(2)} mm</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pt.status === 'CONFORME' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {pt.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{pt.observation || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.ultrassomEquipmentUsed && (
              <p className="text-[11px] text-slate-500 mt-1.5 italic">
                Instrumento empregado: {report.ultrassomEquipmentUsed}
              </p>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* 15. OS 3 CAMPOS DE ANEXOS SEPARADOS (REQUISITO EXPLÍCITO DO USUÁRIO) */}
        {/* ========================================================================= */}
        <section className="mb-8 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-extrabold text-fuchsia-900 uppercase tracking-widest block">
                Rastreabilidade de Documentos Técnicos
              </span>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Paperclip className="w-4 h-4 text-fuchsia-800" />
                <span>15. Documentos Anexos Rastreáveis (ART, Válvula e Ultrassom)</span>
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Arquivados de forma separada
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Campo 1: Anexo da ART */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 uppercase">
                    Anexo 1
                  </span>
                  {report.artAttachment ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Anexado</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">Pendente</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  Anotação de Resp. Técnica (ART)
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  {report.artNumber ? `Nº da ART: ${report.artNumber}` : 'Documento do CREA emitido pelo PH'}
                </p>
                {report.artAttachment && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3 truncate">
                    <p className="font-medium truncate" title={report.artAttachment.fileName}>
                      📄 {report.artAttachment.fileName}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(report.artAttachment.fileSize)}
                    </span>
                  </div>
                )}
              </div>

              {report.artAttachment ? (
                <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedAttachment(report.artAttachment!)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Visualizar</span>
                  </button>
                  <button
                    onClick={() => downloadAttachment(report.artAttachment!)}
                    className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Baixar arquivo da ART"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Nenhum arquivo anexado
                </div>
              )}
            </div>

            {/* Campo 2: Laudo Calibrador de Válvula */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-fuchsia-100 text-fuchsia-950 uppercase">
                    Anexo 2
                  </span>
                  {report.valveCalibrationAttachment ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Anexado</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">Pendente</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  Laudo Calibrador de Válvula (PSV)
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Certificado de calibração em bancada da válvula de segurança
                </p>
                {report.valveCalibrationAttachment && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3 truncate">
                    <p className="font-medium truncate" title={report.valveCalibrationAttachment.fileName}>
                      🛡️ {report.valveCalibrationAttachment.fileName}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(report.valveCalibrationAttachment.fileSize)}
                    </span>
                  </div>
                )}
              </div>

              {report.valveCalibrationAttachment ? (
                <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedAttachment(report.valveCalibrationAttachment!)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Visualizar</span>
                  </button>
                  <button
                    onClick={() => downloadAttachment(report.valveCalibrationAttachment!)}
                    className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Baixar laudo da válvula"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Nenhum arquivo anexado
                </div>
              )}
            </div>

            {/* Campo 3: Laudo Ultrassom */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 uppercase">
                    Anexo 3
                  </span>
                  {report.ultrassomAttachment ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Anexado</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">Pendente</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  Laudo de Ultrassom (END)
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Relatório oficial de medição de espessura por ultrassom
                </p>
                {report.ultrassomAttachment && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3 truncate">
                    <p className="font-medium truncate" title={report.ultrassomAttachment.fileName}>
                      📊 {report.ultrassomAttachment.fileName}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(report.ultrassomAttachment.fileSize)}
                    </span>
                  </div>
                )}
              </div>

              {report.ultrassomAttachment ? (
                <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedAttachment(report.ultrassomAttachment!)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Visualizar</span>
                  </button>
                  <button
                    onClick={() => downloadAttachment(report.ultrassomAttachment!)}
                    className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Baixar laudo de ultrassom"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Nenhum arquivo anexado
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 10 & 11. Recomendações e Conclusões */}
        <section className="mb-8 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>10. Recomendações &amp; 11. Conclusões</span>
          </h3>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
              10. Recomendações Técnicas:
            </span>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {report.recommendations || report.operationalRestrictionsNotes || 'Em aberto / Nenhuma recomendação registrada.'}
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
              11. Conclusão do Profissional Habilitado (PH):
            </span>
            <p className={`text-sm font-extrabold mb-1 ${
              report.technicalOpinion === 'FAVORAVEL'
                ? 'text-emerald-800'
                : report.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                ? 'text-amber-700'
                : report.technicalOpinion === 'INCONCLUSIVO'
                ? 'text-slate-600'
                : 'text-red-700'
            }`}>
              PARECER: {report.technicalOpinion === 'FAVORAVEL'
                ? 'CONFORME / FAVORÁVEL À OPERAÇÃO CONTÍNUA'
                : report.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                ? 'LIBERADO PARA OPERAR COM RESTRIÇÕES'
                : report.technicalOpinion === 'INCONCLUSIVO'
                ? 'EM ABERTO'
                : 'NÃO CONFORME / DESFAVORÁVEL'}
            </p>
          </div>

          {/* 13. Galeria Fotográfica da Inspeção */}
          {report.photos && report.photos.filter(p => p && p !== report.equipmentPhoto).length > 0 && (
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-500 block mb-2">
                13. Registro Fotográfico Adicional
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {report.photos.filter(p => p && p !== report.equipmentPhoto).map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`Registro ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-slate-200"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 13. Próximas Inspeções */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Próxima Inspeção Externa:</span>
              <strong className="text-fuchsia-950 text-sm">
                {report.nextInspections.nextExternalInspectionDate ? new Date(report.nextInspections.nextExternalInspectionDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}
              </strong>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Próxima Inspeção Interna:</span>
              <strong className="text-fuchsia-950 text-sm">
                {report.nextInspections.nextInternalInspectionDate ? new Date(report.nextInspections.nextInternalInspectionDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}
              </strong>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Teste Complementar / Hidrostático:</span>
              <strong className="text-slate-800 text-sm">
                {report.nextInspections.nextComplementaryTestDate ? new Date(report.nextInspections.nextComplementaryTestDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A critério do PH'}
              </strong>
            </div>
          </div>
        </section>

        {/* 14. Responsabilidades e Assinaturas */}
        <section className="pt-6 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
            <div className="p-4 border border-dashed border-slate-300 rounded-xl">
              <div className="h-14 flex items-center justify-center font-serif text-slate-700 italic text-base border-b border-slate-200 mx-6 mb-2">
                {report.technicalResponsible}
              </div>
              <strong className="text-slate-900 block">{report.technicalResponsible}</strong>
              <span className="text-slate-500 block">Profissional Habilitado (PH) • {report.creaNumber}</span>
              <span className="text-[10px] text-slate-400">Responsável Técnico pela Inspeção</span>
            </div>

            <div className="p-4 border border-dashed border-slate-300 rounded-xl">
              <div className="h-14 flex items-center justify-center font-serif text-slate-700 italic text-base border-b border-slate-200 mx-6 mb-2">
                el Ciruelo Agrícola
              </div>
              <strong className="text-slate-900 block">el Ciruelo Agrícola do Brasil Ltda</strong>
              <span className="text-slate-500 block">{report.farm} • Gerência de Manutenção</span>
              <span className="text-[10px] text-slate-400">Representante do Estabelecimento</span>
            </div>
          </div>
        </section>
      </div>

      {/* Attachment In-App Viewer Modal */}
      {selectedAttachment && (
        <AttachmentViewerModal
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  );
};
