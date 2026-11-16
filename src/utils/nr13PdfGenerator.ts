import { jsPDF } from 'jspdf';
import { DocumentAttachment, NR13InspectionReport, NR13UltrassomMatrix } from '../types';
import { FARM_COMPANY_PROFILES } from '../data/nr13InitialData';

/**
 * Loads an image (URL, SVG, PNG, JPEG data-url) onto an off-screen canvas
 * and converts it to a PNG/JPEG dataUrl preserving aspect ratio for jsPDF.addImage.
 */
async function loadImageContain(
  url: string,
  maxWidth = 1000,
  maxHeight = 1000,
  format: 'image/png' | 'image/jpeg' = 'image/jpeg'
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url || !url.trim()) return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width || 600;
          const natH = img.naturalHeight || img.height || 400;
          const scale = Math.min(maxWidth / natW, maxHeight / natH, 1);
          const canvasW = Math.max(1, Math.round(natW * scale));
          const canvasH = Math.max(1, Math.round(natH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = canvasW;
          canvas.height = canvasH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          if (format === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasW, canvasH);
          }

          ctx.drawImage(img, 0, 0, canvasW, canvasH);
          const dataUrl = format === 'image/png'
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.88);
          resolve({ dataUrl, width: canvasW, height: canvasH });
        } catch (err) {
          console.warn('Error rasterizing NR-13 image:', err);
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('pt-BR');
}

function resolveUltrassomMatrix(report: NR13InspectionReport): NR13UltrassomMatrix {
  if (report.ultrassomMatrix) {
    return report.ultrassomMatrix;
  }

  const pts = report.ultrassomPoints || [];
  const val = (index: number) =>
    pts[index]?.measuredThickness !== undefined ? `${pts[index].measuredThickness.toFixed(2)} mm` : '';

  return {
    body: [val(0), val(1), val(2), val(3)],
    leftHead: [val(4), val(5), '', ''],
    rightHead: ['', '', '', '']
  };
}

/**
 * Generates an official 7-page (+ annexes/photos) NR-13 Pressure Vessel Inspection Report PDF
 * strictly modeled after the reference template "MODELO RELATÓRIO DE INSPEÇÃO.pdf"
 * with el Ciruelo branding.
 */
export async function exportNR13ReportToPdf(report: NR13InspectionReport): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 22;
  const contentWidth = pageWidth - margin * 2; // 166

  // Preload official el Ciruelo logo + cover photo
  const logoImg = await loadImageContain('/assets/aistudio/image_adab39d7.png', 500, 200, 'image/png');
  const coverSource = report.equipmentPhoto || report.photos?.[0] || '';
  const coverImg = coverSource ? await loadImageContain(coverSource, 1200, 900, 'image/jpeg') : null;

  const drawRunningHeader = () => {
    // Top-left logo
    if (logoImg) {
      const targetH = 12;
      const ratio = logoImg.width / logoImg.height;
      const targetW = Math.min(46, targetH * ratio);
      doc.addImage(logoImg.dataUrl, 'PNG', margin, 10, targetW, targetH);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(136, 14, 79);
      doc.text('el Ciruelo', margin, 18);
    }

    // Header Title next to logo, centered in remaining band
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RELATÓRIO DE INSPEÇÃO DE', 110, 15.5, { align: 'center' });
    doc.text('SEGURANÇA EM VASO DE PRESSÃO', 110, 20.5, { align: 'center' });
  };

  const drawFieldRow = (
    label: string,
    value: string | number | undefined,
    yPos: number,
    opts?: { boldLabel?: boolean; fontSize?: number; lineStep?: number }
  ): number => {
    const fontSize = opts?.fontSize ?? 10.5;
    const lineStep = opts?.lineStep ?? 7.2;
    const valStr = value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : '';

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', opts?.boldLabel ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);

    const labelText = `${label} `;
    const labelW = doc.getTextWidth(labelText);

    if (!valStr) {
      doc.text(label, margin, yPos);
      return yPos + lineStep;
    }

    const availableW = contentWidth - labelW;
    if (availableW > 30) {
      const wrapped = doc.splitTextToSize(valStr, availableW);
      doc.text(labelText, margin, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(wrapped[0], margin + labelW, yPos);
      let nextY = yPos + lineStep;
      for (let idx = 1; idx < wrapped.length; idx++) {
        doc.text(wrapped[idx], margin + 4, nextY);
        nextY += lineStep - 1.5;
      }
      return nextY;
    } else {
      doc.text(labelText, margin, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(valStr, margin + 4, yPos + 5.5);
      return yPos + lineStep + 4;
    }
  };

  const drawBulletRow = (label: string, answer: string | undefined, yPos: number, gap = 6.2): number => {
    doc.setFillColor(15, 23, 42);
    doc.circle(margin + 3.5, yPos - 1.2, 0.85, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);

    const ansStr = answer && answer.trim() ? answer.trim() : '';
    const fullText = ansStr ? `${label}: ${ansStr}` : `${label}:`;
    const lines = doc.splitTextToSize(fullText, contentWidth - 9);

    if (lines.length === 1) {
      const prefix = ansStr ? `${label}: ` : `${label}:`;
      const prefixW = doc.getTextWidth(prefix);
      doc.text(prefix, margin + 8, yPos);
      if (ansStr) {
        doc.setFont('helvetica', 'bold');
        doc.text(ansStr, margin + 8 + prefixW, yPos);
      }
      return yPos + gap;
    }

    doc.text(lines, margin + 8, yPos);
    return yPos + lines.length * 4.8 + 1.8;
  };

  const company = report.companyData || FARM_COMPANY_PROFILES[report.farm] || {
    razaoSocial: report.parties?.owner || 'el Ciruelo Agrícola do Brasil Ltda',
    cnpj: '',
    address: '',
    cityState: '',
    cep: ''
  };

  const eq = report.equipment;
  const natureLabel =
    report.inspectionNature === 'INICIAL'
      ? 'Inicial'
      : report.inspectionNature === 'EXTRAORDINARIA'
      ? 'Extraordinária'
      : 'Periódica';

  // =========================================================================
  // PÁGINA 1: CAPA OFICIAL
  // =========================================================================
  drawRunningHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(21);
  doc.setTextColor(15, 23, 42);
  doc.text('RELATÓRIO DE INSPEÇÃO', pageWidth / 2, 46, { align: 'center' });
  doc.text('NR 13 – VASOS DE PRESSÃO', pageWidth / 2, 62, { align: 'center' });

  doc.setFontSize(12);
  doc.text('IMAGEM DO EQUIPAMENTO:', pageWidth / 2, 77, { align: 'center' });

  // Cover Photo Box (y: 84 -> 148)
  const photoAreaX = margin + 15;
  const photoAreaY = 84;
  const photoAreaW = contentWidth - 30;
  const photoAreaH = 62;

  if (coverImg) {
    const ratio = coverImg.width / coverImg.height;
    let drawW = photoAreaW;
    let drawH = drawW / ratio;
    if (drawH > photoAreaH) {
      drawH = photoAreaH;
      drawW = drawH * ratio;
    }
    const drawX = pageWidth / 2 - drawW / 2;
    const drawY = photoAreaY + (photoAreaH - drawH) / 2;
    doc.setDrawColor(203, 213, 225);
    doc.rect(drawX - 1, drawY - 1, drawW + 2, drawH + 2, 'S');
    doc.addImage(coverImg.dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text('FOTO', pageWidth / 2, 112, { align: 'center' });
  }

  let y = 158;
  y = drawFieldRow('RELATÓRIO N.º:', report.code, y, { fontSize: 11.5, lineStep: 8.5 });
  y = drawFieldRow('VASO N.º:', report.vesselNumber || report.equipmentTag, y, { fontSize: 11.5, lineStep: 8.5 });
  y = drawFieldRow('ART N.º:', report.artNumber || 'Conforme anexo', y, { fontSize: 11.5, lineStep: 8.5 });
  y = drawFieldRow('DATA DE INÍCIO DA INSPEÇÃO:', formatDateBR(report.inspectionDate), y, { fontSize: 11.5, lineStep: 8.5 });
  y = drawFieldRow('DATA DE TÉRMINO DA INSPEÇÃO:', formatDateBR(report.inspectionEndDate || report.inspectionDate), y, { fontSize: 11.5, lineStep: 8.5 });
  y = drawFieldRow('TIPO DE INSPEÇÃO:', natureLabel, y, { fontSize: 11.5, lineStep: 8.5 });

  // Signature & Stamp Box
  const sigBoxX = 43;
  const sigBoxY = 222;
  const sigBoxW = 124;
  const sigBoxH = 44;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.rect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ASSINATURA E CARIMBO DO RESPONSÁVEL PELA INSPEÇÃO', pageWidth / 2, sigBoxY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(report.technicalResponsible || '', pageWidth / 2, sigBoxY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(report.creaNumber || '', pageWidth / 2, sigBoxY + 30, { align: 'center' });

  // Dotted signature line inside box
  doc.setLineDashPattern([1, 1], 0);
  doc.line(sigBoxX + 2, sigBoxY + 35, sigBoxX + sigBoxW - 2, sigBoxY + 35);
  doc.setLineDashPattern([], 0);

  // =========================================================================
  // PÁGINA 2: SUMÁRIO
  // =========================================================================
  doc.addPage();
  drawRunningHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SUMÁRIO:', margin, 44);

  const sumarioItems = [
    '1.   OBJETIVOS E CONSIDERAÇÕES',
    '2.   DADOS DA EMPRESA',
    '3.   DADOS TÉCNICOS DO VASO',
    '4.   CATEGORIA DO VASO',
    '5.   INSPEÇÕES REALIZADAS NO VASO',
    '6.   TESTES REALIZADOS',
    '7.   DADOS TÉCNICOS DAS VÁLVULAS DE SEGURANÇA',
    '8.   INSPEÇÕES REALIZADAS NAS VÁLVULAS',
    '9.   VERIFICAÇÕES DE DOCUMENTOS',
    '10.  RECOMENDAÇÕES',
    '11.  CONCLUSÕES',
    '12.  PRÓXIMA INSPEÇÃO',
    '13.  REGISTRO COM IMAGENS'
  ];

  y = 54;
  doc.setFontSize(10.5);
  sumarioItems.forEach((item) => {
    doc.text(item, margin + 6, y);
    y += 6.2;
  });

  // =========================================================================
  // PÁGINA 3: SEÇÃO 1, SEÇÃO 2 E INÍCIO DA SEÇÃO 3
  // =========================================================================
  doc.addPage();
  drawRunningHeader();

  y = 43;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('1. OBJETIVO E CRITÉRIOS DA INSPEÇÃO', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const objP1 =
    'O presente relatório tem por objetivo registrar os resultados da inspeção técnica realizada em um vaso de pressão, contemplando a avaliação de suas condições de integridade e segurança, em conformidade com os requisitos estabelecidos pela Norma Regulamentadora nº 13 (NR-13) — Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos de Armazenamento, aprovada pela Portaria nº 3.214, de 8 de junho de 1978, e suas atualizações, incluindo a Portaria MTP nº 1.846, de 1º de julho de 2022.';
  const p1Lines = doc.splitTextToSize(objP1, contentWidth);
  doc.text(p1Lines, margin, y);
  y += p1Lines.length * 4.8 + 4;

  const objP2 =
    'Para fins de padronização e identificação dos resultados obtidos durante a inspeção, serão adotadas as seguintes classificações:';
  const p2Lines = doc.splitTextToSize(objP2, contentWidth);
  doc.text(p2Lines, margin, y);
  y += p2Lines.length * 4.8 + 3;

  const criteriaBullets = [
    'C — APROVADO / CONFORME: para os itens inspecionados que atendam aos requisitos normativos e aos critérios técnicos aplicáveis;',
    'NC — REPROVADO / NÃO CONFORME: para os itens que apresentem não conformidades em relação aos requisitos estabelecidos;',
    'NA — NÃO APLICÁVEL: para os itens não aplicáveis às características ou às condições específicas do equipamento inspecionado;'
  ];
  criteriaBullets.forEach((b) => {
    doc.setFillColor(15, 23, 42);
    doc.circle(margin + 4, y - 1.2, 0.85, 'F');
    const bLines = doc.splitTextToSize(b, contentWidth - 10);
    doc.text(bLines, margin + 9, y);
    y += bLines.length * 4.7 + 2;
  });

  y += 1.5;
  const objP3 =
    'As observações técnicas, não conformidades identificadas, recomendações e medidas corretivas eventualmente necessárias serão apresentadas ao final deste relatório, com o objetivo de subsidiar a avaliação das condições operacionais e de segurança do equipamento, bem como orientar as providências necessárias para o atendimento aos requisitos normativos aplicáveis.';
  const p3Lines = doc.splitTextToSize(objP3, contentWidth);
  doc.text(p3Lines, margin, y);
  y += p3Lines.length * 4.8 + 6;

  // 2. DADOS DA EMPRESA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. DADOS DA EMPRESA:', margin, y);
  y += 8;

  y = drawFieldRow('Razão Social:', company.razaoSocial, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('CNPJ:', company.cnpj, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('Endereço:', company.address, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('Cidade/UF:', company.cityState, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('Cep:', company.cep, y, { fontSize: 10.5, lineStep: 9 });

  // 3. DADOS TÉCNICOS DO VASO (primeira parte)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. DADOS TÉCNICOS DO VASO', margin, y);
  y += 8;

  const vesselIdent = report.vesselNumber
    ? (report.equipmentTag.includes(report.vesselNumber) ? report.equipmentTag : `${report.vesselNumber} - ${report.equipmentTag}`)
    : report.equipmentTag;

  const pressureUnit =
    String(eq.pth || eq.maxOperatingPressure || '').toLowerCase().includes('bar')
      ? 'Bar'
      : 'kgf/cm²';

  y = drawFieldRow('Identificação:', vesselIdent, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('Fabricante:', eq.manufacturer, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('Ano de fabricação:', eq.manufactureYear, y, { fontSize: 10.5, lineStep: 7.2 });
  y = drawFieldRow('PTH:', eq.pth || (eq.pmta ? `${(Number(eq.pmta) * 1.5).toFixed(2)} ${pressureUnit}` : '-'), y, { fontSize: 10.5, lineStep: 7.2 });
  drawFieldRow('PMTA:', `${eq.pmta} ${pressureUnit}`, y, { fontSize: 10.5, lineStep: 7.2 });

  // =========================================================================
  // PÁGINA 4: CONTINUAÇÃO DA SEÇÃO 3 (DADOS TÉCNICOS DO VASO)
  // =========================================================================
  doc.addPage();
  drawRunningHeader();

  y = 33;
  const page4Fields: Array<[string, string | number | undefined]> = [
    ['Pressão Máxima Operação:', eq.maxOperatingPressure || `${eq.normalOperatingPressure} kgf/cm²`],
    ['Tipo Equipamento:', eq.equipmentType || 'Vaso de Pressão'],
    ['Nº de Série:', eq.serialNumber],
    ['Volume:', `${eq.geometricVolume} ${eq.volumeUnit}`],
    ['Norma do projeto:', eq.projectCode],
    ['Edição:', eq.designCodeEdition || '-'],
    ['Finalidade do vaso:', eq.vesselPurpose || report.equipmentDescription || '-'],
    ['Tipo de Vaso:', eq.vesselType || (eq.installationConfig === 'HORIZONTAL' ? 'Horizontal' : 'Vertical')],
    ['Diâmetro Externo:', eq.outerDiameter || eq.mainDimensions || '-'],
    ['Comprimento:', eq.length || '-'],
    ['Tara:', eq.tareWeight || '-'],
    ['Espessura do Corpo:', eq.bodyThickness || '-'],
    ['Espessura da Calota:', eq.headThickness || '-'],
    ['Calota (Inferior Esquerdo):', eq.headBottomLeft || '-'],
    ['Calota (Superior Direito):', eq.headTopRight || '-'],
    ['Altura:', eq.height || '-'],
    ['Largura:', eq.width || '-'],
    ['Espessura Mínima Corpo:', eq.minBodyThickness || '-'],
    ['Espessura Mínima Calota:', eq.minHeadThickness || '-'],
    ['Local:', eq.local || report.farm],
    ['Área:', eq.area || report.sector],
    ['Modelo:', eq.model],
    ['Material Fabricação:', eq.material],
    ['Temperatura de Projeto:', eq.designTemperature],
    ['Temperatura de Trabalho:', eq.operatingTemperature || '-']
  ];

  page4Fields.forEach(([label, val]) => {
    y = drawFieldRow(label, val, y, { fontSize: 10.2, lineStep: 8.1 });
  });

  // =========================================================================
  // PÁGINA 5: SEÇÃO 4, SEÇÃO 5 E SEÇÃO 6 (TABELA ULTRASSOM)
  // =========================================================================
  doc.addPage();
  drawRunningHeader();

  y = 43;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('4. DETERMINAÇÃO DA CATEGORIA DO VASO', margin, y);
  y += 7.5;

  y = drawFieldRow('Fluido de trabalho:', `${eq.serviceFluid}${eq.fluidGroup ? ` (${eq.fluidGroup})` : ''}`, y, { fontSize: 10.2, lineStep: 7 });
  y = drawFieldRow('Classe do fluido:', `Classe ${report.nr13Categorization.fluidClass}`, y, { fontSize: 10.2, lineStep: 7 });
  y = drawFieldRow(
    'Pressão x volume:',
    `P = ${report.nr13Categorization.pressureMpa} MPa x V = ${report.nr13Categorization.volumeM3} m³ -> PxV = ${report.nr13Categorization.pvProduct} MPa·m³`,
    y,
    { fontSize: 10.2, lineStep: 7 }
  );
  y = drawFieldRow(
    'Grupo potencial de risco:',
    report.nr13Categorization.riskGroup || `Categoria ${report.nr13Categorization.category}`,
    y,
    { fontSize: 10.2, lineStep: 9.5 }
  );

  // 5. TIPO E DESCRIÇÃO DA(S) INSPEÇÃO(ÕES) REALIZADA(S)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('5. TIPO E DESCRIÇÃO DA(S) INSPEÇÃO(ÕES) REALIZADA(S)', margin, y);
  y += 7;

  const vc = report.vesselChecklist;
  const vesselChecks: Array<[string, string]> = vc
    ? [
        ['Inspeção visual', vc.visualInspection || ''],
        ['Medição de espessura', vc.thicknessMeasurement || ''],
        ['Calibração de válvula de segurança', vc.safetyValveCalibration || ''],
        ['Vazamento', vc.leakage || ''],
        ['Instalação de adesivo', vc.stickerInstallation || ''],
        ['Adesivo com informações de fábrica', vc.factoryInfoSticker || ''],
        ['Local de fácil acesso', vc.easyAccess || ''],
        ['Local confinado', vc.confinedSpace || ''],
        ['Iluminação de emergência', vc.emergencyLighting || ''],
        ['O vaso de pressão funciona normalmente', vc.operatesNormally || ''],
        ['O vaso de pressão satisfaz a todas as condições de segurança constantes na NR-13', vc.meetsAllNR13 || ''],
        ['A parte de caracterização do vaso acessível a este exame confere com o que, sobre ele, consta no Prontuário', vc.matchesDossier || ''],
        ['Foi observada alguma anomalia capaz de prejudicar a segurança', vc.anomalyFound || ''],
        ['O vaso de pressão possui instrumento de leitura da pressão interna (manômetro)', vc.hasPressureGauge || ''],
        ['O vaso de pressão possui válvula de segurança', vc.hasSafetyValve || ''],
        ['Número de identificação', vc.identificationNumber || '']
      ]
    : [
        ['Inspeção visual', report.scope.externalVisual.performed ? 'Realizada / Conforme' : 'Não realizada'],
        ['Medição de espessura', report.scope.ultrassom.performed ? 'Realizada / Conforme' : 'Não realizada'],
        ['Calibração de válvula de segurança', report.devicesVerification.safetyValveCondition === 'CONFORME' ? 'Realizada / Em dia' : 'Pendente'],
        ['Vazamento', 'Não constatado'],
        ['Instalação de adesivo', 'Sim'],
        ['Adesivo com informações de fábrica', report.devicesVerification.nameplateCondition === 'CONFORME' ? 'Sim / Legível' : 'Não conforme'],
        ['Local de fácil acesso', 'Sim'],
        ['Local confinado', 'Não'],
        ['Iluminação de emergência', 'Sim'],
        ['O vaso de pressão funciona normalmente', report.technicalOpinion === 'DESFAVORAVEL' ? 'Não' : 'Sim'],
        ['O vaso de pressão satisfaz a todas as condições de segurança constantes na NR-13', report.technicalOpinion === 'FAVORAVEL' ? 'Sim' : 'Com recomendações'],
        ['A parte de caracterização do vaso acessível a este exame confere com o que, sobre ele, consta no Prontuário', 'Sim'],
        ['Foi observada alguma anomalia capaz de prejudicar a segurança', report.nonConformities.length > 0 ? 'Sim' : 'Não'],
        ['O vaso de pressão possui instrumento de leitura da pressão interna (manômetro)', report.devicesVerification.pressureGaugeCondition === 'NA' ? 'Não' : 'Sim'],
        ['O vaso de pressão possui válvula de segurança', report.devicesVerification.safetyValveCondition === 'NA' ? 'Não' : 'Sim'],
        ['Número de identificação', report.vesselNumber || report.equipmentTag]
      ];

  vesselChecks.forEach(([label, ans]) => {
    y = drawBulletRow(label, ans, y, 5.2);
  });

  y += 3;
  // 6. TESTES REALIZADOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('6. TESTES REALIZADOS', margin, y);
  y += 7;

  const ultrassomAns =
    report.ultrassomPerformed !== undefined
      ? (report.ultrassomPerformed === 'SIM' ? 'Sim' : report.ultrassomPerformed === 'NAO' ? 'Não' : '')
      : (report.scope.ultrassom.performed ? 'Sim' : 'Não');

  y = drawBulletRow(
    'Foi realizado medição de espessura por ultrassom',
    ultrassomAns,
    y,
    5.8
  );
  y = drawBulletRow(
    'Quais os dados obtidos',
    report.ultrassomEquipmentUsed ? `Instrumento: ${report.ultrassomEquipmentUsed}` : '',
    y,
    5.8
  );

  y += 2;
  // 6-column Table: CORPO | TAMPO ESQUERDO | TAMPO DIREITO
  const matrix = resolveUltrassomMatrix(report);
  const tableX = margin + 4;
  const colW = (contentWidth - 8) / 6; // ~26.33mm
  const rowH = 5.4;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Header Row 1: Group titles
  const groups = ['CORPO', 'TAMPO ESQUERDO', 'TAMPO DIREITO'];
  groups.forEach((g, idx) => {
    const gx = tableX + idx * colW * 2;
    doc.rect(gx, y, colW * 2, rowH, 'S');
    doc.text(g, gx + colW, y + 3.8, { align: 'center' });
  });
  y += rowH;

  // Header Row 2: PONTO | MEDIDA x3
  for (let i = 0; i < 6; i++) {
    const cx = tableX + i * colW;
    doc.rect(cx, y, colW, rowH, 'S');
    doc.text(i % 2 === 0 ? 'PONTO' : 'MEDIDA', cx + colW / 2, y + 3.8, { align: 'center' });
  }
  y += rowH;

  // 4 Data Rows
  for (let r = 0; r < 4; r++) {
    const cells = [
      `P${r + 1}`,
      matrix.body[r] || '',
      `B${r + 1}`,
      matrix.leftHead[r] || '',
      `B${r + 1}`,
      matrix.rightHead[r] || ''
    ];
    cells.forEach((cellVal, cIdx) => {
      const cx = tableX + cIdx * colW;
      doc.rect(cx, y, colW, rowH, 'S');
      doc.setFont('helvetica', cIdx % 2 === 0 ? 'bold' : 'normal');
      doc.text(cellVal, cx + colW / 2, y + 3.8, { align: 'center' });
    });
    y += rowH;
  }

  // =========================================================================
  // PÁGINA 6: MAPA DOS PONTOS + SEÇÕES 7, 8, 9, 10
  // =========================================================================
  doc.addPage();
  drawRunningHeader();

  y = 33;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mapa dos pontos de medição de espessuras:', margin, y);

  // Draw clean vector diagram matching template (Capsule P1..P4 + Circle B1..B4)
  const capX = 56;
  const capY = 39;
  const capW = 74;
  const capH = 18;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.55);
  doc.roundedRect(capX, capY, capW, capH, 6, 6, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('P1', capX + 10, capY + 6);
  doc.text('P2', capX + capW - 14, capY + 6);
  doc.setTextColor(185, 28, 28);
  doc.text('P3', capX + 10, capY + 14.5);
  doc.text('P4', capX + capW - 14, capY + 14.5);

  // Head circle B1..B4
  const circCx = 148;
  const circCy = 48;
  const circR = 9;
  doc.setDrawColor(15, 23, 42);
  doc.circle(circCx, circCy, circR, 'S');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('B1', circCx - 5.5, circCy - 2);
  doc.text('B2', circCx + 2, circCy - 2);
  doc.setTextColor(185, 28, 28);
  doc.text('B3', circCx - 5.5, circCy + 4.5);
  doc.text('B4', circCx + 2, circCy + 4.5);

  // 7. DADOS TÉCNICOS DA VÁLVULA
  y = 84;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('7. DADOS TÉCNICOS DA VÁLVULA', margin, y);
  y += 6.5;

  const sv = report.safetyValveTechnical;

  if (sv && (sv.tag || sv.manufacturer || sv.setPressure)) {
    const valveSummary = [
      `TAG: ${sv.tag || '-'} | Fabricante/Modelo: ${sv.manufacturer || '-'} ${sv.model || ''} | Conexão: ${sv.connectionSize || '-'}`,
      `Fluido: ${sv.fluidType || eq.serviceFluid} | Pressão Ajuste: ${sv.setPressure || '-'} | Abertura: ${sv.openingPressure || '-'}`,
      `Certificado: ${sv.certificateNumber || '-'} | Calibração: ${formatDateBR(sv.calibrationDate)} | Validade: ${formatDateBR(sv.nextCalibrationDate)}`
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    valveSummary.forEach((line) => {
      doc.text(line, margin + 2, y);
      y += 4.8;
    });
    y += 3;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(report.devicesVerification.safetyValveNotes || 'Válvula de segurança conforme cadastro técnico.', margin + 2, y);
    y += 8.5;
  }

  // 8. TIPO E DESCRIÇÃO DA(S) INSPEÇÃO(ÕES) REALIZADA(S)
  y = Math.max(y + 2, 108);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('8. TIPO E DESCRIÇÃO DA(S) INSPEÇÃO(ÕES) REALIZADA(S)', margin, y);
  y += 7;

  y = drawBulletRow(
    'Inspeção visual',
    sv ? (sv.visualInspection || '') : (report.devicesVerification.safetyValveCondition === 'CONFORME' ? 'Conforme' : report.devicesVerification.safetyValveCondition),
    y,
    6
  );
  y = drawBulletRow(
    'Calibração de válvula de segurança',
    sv ? (sv.calibrationStatus || '') : (report.devicesVerification.safetyValveCondition === 'CONFORME' ? 'Calibrada e aprovada' : 'Pendente / Verificar'),
    y,
    6
  );
  y = drawBulletRow(
    'Vazamento',
    sv ? (sv.leakage || '') : 'Sem vazamento constatado',
    y,
    8.5
  );

  // 9. VERIFICAÇÃO DE DOCUMENTAÇÃO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('9. VERIFICAÇÃO DE DOCUMENTAÇÃO', margin, y);
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.8);
  const docNR13Text =
    'Conforme item 13.5.3.1 da NR13, todo vaso de pressão enquadrado nas categorias "I" ou "II" deve possuir manual de operação próprio ou instruções de operação contidas no manual de operação de unidade onde estiver instalado, em língua portuguesa e de fácil acesso aos operadores, contendo no mínimo:';
  const docNR13Lines = doc.splitTextToSize(docNR13Text, contentWidth);
  doc.text(docNR13Lines, margin, y);
  y += docNR13Lines.length * 4.7 + 5;

  const dc = report.documentationCheck;
  const docBullets: Array<[string, string]> = dc
    ? [
        ['A documentação foi encontrada completa e em dia', dc.completeAndUpToDate || ''],
        ['A presente inspeção foi realizada dentro do prazo legal', dc.withinLegalDeadline || ''],
        ['Prontuário', dc.dossierProntuario || ''],
        ['Desenho', dc.drawingDesenho || ''],
        ['Livro de registro de ocorrência', dc.occurrenceBook || ''],
        ['Procedimento de partida e parada', dc.startupShutdownProcedure || ''],
        ['Procedimento para situações de emergência', dc.emergencyProcedure || '']
      ]
    : [
        ['A documentação foi encontrada completa e em dia', report.scope.documentAnalysis.performed ? 'Sim' : 'Não'],
        ['A presente inspeção foi realizada dentro do prazo legal', 'Sim'],
        ['Prontuário', 'Sim'],
        ['Desenho', 'Sim'],
        ['Livro de registro de ocorrência', 'Sim'],
        ['Procedimento de partida e parada', 'Sim'],
        ['Procedimento para situações de emergência', 'Sim']
      ];

  docBullets.forEach(([label, ans]) => {
    y = drawBulletRow(label, ans, y, 5.8);
  });

  y += 5;
  // 10. RECOMENDAÇÕES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('10. RECOMENDAÇÕES', margin, y);
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const recText =
    report.recommendations !== undefined
      ? report.recommendations.trim()
      : (report.operationalRestrictionsNotes?.trim() || '');
  if (recText) {
    const recLines = doc.splitTextToSize(recText, contentWidth);
    doc.text(recLines, margin, y);
  }

  // =========================================================================
  // PÁGINA 7: SEÇÕES 11 A 16
  // =========================================================================
  doc.addPage();
  drawRunningHeader();

  y = 43;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('11. CONCLUSÕES', margin, y);
  y += 7;

  const hasAnyCheck = report.conclusionCheck
    ? (report.conclusionCheck.conforme || report.conclusionCheck.naoConforme || report.conclusionCheck.releasedWithRestrictions)
    : true;
  const isConforme = report.conclusionCheck ? report.conclusionCheck.conforme : (report.technicalOpinion === 'FAVORAVEL');
  const isNaoConforme = report.conclusionCheck ? report.conclusionCheck.naoConforme : (report.technicalOpinion === 'DESFAVORAVEL');
  const isWithRestr = report.conclusionCheck ? report.conclusionCheck.releasedWithRestrictions : (report.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES');

  y = drawBulletRow('Conforme', hasAnyCheck ? (isConforme ? 'Sim' : 'Não') : '', y, 6);
  y = drawBulletRow('Não conforme', hasAnyCheck ? (isNaoConforme ? 'Sim' : 'Não') : '', y, 6);
  y = drawBulletRow('Liberado para operar com restrições (verificar item 10, recomendações)', hasAnyCheck ? (isWithRestr ? 'Sim' : 'Não') : '', y, 9);

  // 12. CRONOGRAMA DE PRÓXIMA INSPEÇÃO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('12. CRONOGRAMA DE PRÓXIMA INSPEÇÃO', margin, y);
  y += 7;

  const extDate = formatDateBR(report.nextInspections.nextExternalInspectionDate);
  const intDate = formatDateBR(report.nextInspections.nextInternalInspectionDate);
  const compDate = formatDateBR(report.nextInspections.nextComplementaryTestDate);

  const scheduleParts: string[] = [];
  if (extDate !== '-') scheduleParts.push(`Inspeção Externa: ${extDate}`);
  if (intDate !== '-') scheduleParts.push(`Inspeção Interna: ${intDate}`);
  if (compDate !== '-') scheduleParts.push(`Teste Complementar: ${compDate}`);

  y = drawBulletRow(
    'Data',
    scheduleParts.join(' | '),
    y,
    12
  );

  // Signature line for engineer and companion
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.8);
  doc.text(`${report.technicalResponsible}  /  ${report.parties?.inspectionCompanion || 'Acompanhante na empresa'}`, pageWidth / 2, y, { align: 'center' });
  y += 2;
  doc.setDrawColor(100, 116, 139);
  doc.line(margin + 10, y, margin + contentWidth - 10, y);
  y += 4.5;
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Assinatura de engenheiro responsável e acompanhante na empresa', pageWidth / 2, y, { align: 'center' });

  y += 10;
  // 13. REGISTRO FOTOGRÁFICO DA INSPEÇÃO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('13. REGISTRO FOTOGRÁFICO DA INSPEÇÃO', margin, y);
  y += 6.5;

  const extraPhotos = (report.photos || []).filter((p) => p && p !== report.equipmentPhoto);
  if (extraPhotos.length > 0) {
    const thumbW = (contentWidth - 6) / 2;
    const thumbH = 44;
    for (let i = 0; i < extraPhotos.length; i++) {
      const col = i % 2;
      if (col === 0 && y + thumbH > pageHeight - 25) {
        doc.addPage();
        drawRunningHeader();
        y = 35;
      }
      const loaded = await loadImageContain(extraPhotos[i], 800, 600, 'image/jpeg');
      const px = margin + col * (thumbW + 6);
      doc.setDrawColor(203, 213, 225);
      doc.rect(px, y, thumbW, thumbH, 'S');
      if (loaded) {
        const r = loaded.width / loaded.height;
        let dw = thumbW - 2;
        let dh = dw / r;
        if (dh > thumbH - 2) {
          dh = thumbH - 2;
          dw = dh * r;
        }
        doc.addImage(loaded.dataUrl, 'JPEG', px + (thumbW - dw) / 2, y + (thumbH - dh) / 2, dw, dh);
      }
      if (col === 1 || i === extraPhotos.length - 1) {
        y += thumbH + 5;
      }
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      coverImg ? 'Foto principal registrada na capa deste relatório.' : 'Sem fotos adicionais anexadas.',
      margin + 2,
      y
    );
    y += 8;
  }

  const renderAnnexHeadingAndSummary = (title: string, att?: DocumentAttachment, fallbackNote?: string) => {
    if (y + 22 > pageHeight - 22) {
      doc.addPage();
      drawRunningHeader();
      y = 35;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    if (att) {
      doc.setTextColor(22, 101, 52);
      doc.text(`Arquivo anexado: ${att.fileName}`, margin + 2, y);
      y += 7;
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text(fallbackNote || 'Documento pendente de anexo.', margin + 2, y);
      y += 7;
    }
  };

  renderAnnexHeadingAndSummary(
    '14. ANEXO DE CALIBRAÇÃO DO CALIBRADOR DE VÁLVULA',
    report.valveCalibrationAttachment,
    report.safetyValveTechnical?.certificateNumber
      ? `Certificado vinculado nº ${report.safetyValveTechnical.certificateNumber}`
      : 'Laudo da válvula não anexado.'
  );
  renderAnnexHeadingAndSummary(
    '15. ANEXO DE CALIBRAÇÃO DO ULTRASSOM',
    report.ultrassomAttachment,
    report.ultrassomEquipmentUsed
      ? `Equipamento utilizado: ${report.ultrassomEquipmentUsed}`
      : 'Laudo de ultrassom não anexado.'
  );
  renderAnnexHeadingAndSummary(
    '16. ANEXO DE ART',
    report.artAttachment,
    report.artNumber ? `ART registrada nº ${report.artNumber}` : 'ART não anexada.'
  );

  // Render dedicated annex preview pages for any image/SVG attachments so printing includes them
  const imageAnnexes: Array<{ title: string; att: DocumentAttachment }> = [];
  const isImageLike = (att?: DocumentAttachment): att is DocumentAttachment =>
    Boolean(att && (att.mimeType?.startsWith('image/') || att.dataUrl?.startsWith('data:image/')));

  if (isImageLike(report.valveCalibrationAttachment)) {
    imageAnnexes.push({ title: '14. ANEXO DE CALIBRAÇÃO DO CALIBRADOR DE VÁLVULA', att: report.valveCalibrationAttachment });
  }
  if (isImageLike(report.ultrassomAttachment)) {
    imageAnnexes.push({ title: '15. ANEXO DE CALIBRAÇÃO DO ULTRASSOM', att: report.ultrassomAttachment });
  }
  if (isImageLike(report.artAttachment)) {
    imageAnnexes.push({ title: '16. ANEXO DE ART', att: report.artAttachment });
  }

  for (const item of imageAnnexes) {
    const rendered = await loadImageContain(item.att.dataUrl, 1200, 1600, 'image/jpeg');
    if (rendered) {
      doc.addPage();
      drawRunningHeader();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(item.title, margin, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Documento: ${item.att.fileName}`, margin, 42);

      const maxBoxW = contentWidth;
      const maxBoxH = pageHeight - 70;
      const ratio = rendered.width / rendered.height;
      let dw = maxBoxW;
      let dh = dw / ratio;
      if (dh > maxBoxH) {
        dh = maxBoxH;
        dw = dh * ratio;
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect((pageWidth - dw) / 2, 47, dw, dh, 'S');
      doc.addImage(rendered.dataUrl, 'JPEG', (pageWidth - dw) / 2, 47, dw, dh);
    }
  }

  // Page numbers at bottom right matching reference template
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(i), pageWidth - margin, pageHeight - 16, { align: 'right' });
  }

  const cleanCode = report.code.replace(/[/\\?%*:|"<>]/g, '_');
  const cleanVessel = (report.vesselNumber || report.equipmentTag).replace(/[/\\?%*:|"<>]/g, '_').substring(0, 28);
  doc.save(`Relatorio_NR13_${cleanCode}_${cleanVessel}.pdf`);
}
