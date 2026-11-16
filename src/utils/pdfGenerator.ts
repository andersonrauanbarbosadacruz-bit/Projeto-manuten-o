import { jsPDF } from 'jspdf';
import { ChecklistRecord, WorkOrder, CHECKLIST_TYPE_LABELS } from '../types';
import { getChecklistEffectiveStatus, isChecklistItemResolved } from './complianceHelper';

/**
 * Loads an image (data-url, SVG, remote URL, or blob) onto an off-screen canvas
 * and exports it as a lightweight JPEG data URL suitable for jsPDF.addImage.
 */
async function loadAndRasterizeImage(
  url: string,
  targetWidth = 600,
  targetHeight = 450
): Promise<string | null> {
  if (!url || !url.trim()) return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(url.startsWith('data:image/jpeg') ? url : null);
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Calculate aspect ratio cover inside targetWidth x targetHeight
          const naturalW = img.naturalWidth || img.width || targetWidth;
          const naturalH = img.naturalHeight || img.height || targetHeight;
          const imgRatio = naturalW / naturalH;
          const targetRatio = targetWidth / targetHeight;

          let renderW = targetWidth;
          let renderH = targetHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (imgRatio > targetRatio) {
            renderH = targetHeight;
            renderW = Math.round(targetHeight * imgRatio);
            offsetX = Math.round((targetWidth - renderW) / 2);
          } else {
            renderW = targetWidth;
            renderH = Math.round(targetWidth / imgRatio);
            offsetY = Math.round((targetHeight - renderH) / 2);
          }

          ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
          const raster = canvas.toDataURL('image/jpeg', 0.85);
          resolve(raster);
        } catch (e) {
          console.warn('Canvas rasterize error:', e);
          if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/png')) {
            resolve(url);
          } else {
            resolve(null);
          }
        }
      };

      img.onerror = () => {
        if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/png')) {
          resolve(url);
        } else {
          resolve(null);
        }
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates an official, uncropped, multi-page vector PDF for a Work Order (Ordem de Serviço).
 * Includes header branding, complete metadata grid, problem description,
 * solution report, materials table, full photographic evidence (before/after),
 * signature blocks, and page numbers.
 */
export async function exportWorkOrderToPdf(wo: WorkOrder) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 12;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`el Ciruelo • Ordem de Serviço: ${wo.code} - ${wo.farm} (Continuação)`, margin, y);
    y += 3.5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
  };

  // 1. TOP BRAND HEADER
  doc.setFillColor(133, 77, 14); // Amber 800
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('EL CIRUELO • GESTÃO E MANUTENÇÃO OPERACIONAL', margin + 6, y + 8);

  doc.setFontSize(11);
  doc.setTextColor(254, 243, 199);
  doc.text('ORDEM DE SERVIÇO DE MANUTENÇÃO OFICIAL', margin + 6, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(253, 230, 138);
  doc.text(`Unidade: ${wo.farm} • Sistema de Controle Operacional de Ativos`, margin + 6, y + 21);

  // Status Badge on top-right
  const statusConfig: Record<string, { label: string; bg: number[]; text: number[] }> = {
    CONCLUIDA: { label: 'CONCLUÍDA', bg: [22, 101, 52], text: [255, 255, 255] },
    EM_ANDAMENTO: { label: 'EM ANDAMENTO', bg: [217, 119, 6], text: [255, 255, 255] },
    ABERTA: { label: 'ABERTA / PENDENTE', bg: [185, 28, 28], text: [255, 255, 255] },
    CANCELADA: { label: 'CANCELADA', bg: [100, 116, 139], text: [255, 255, 255] },
    RASCUNHO: { label: 'RASCUNHO', bg: [37, 99, 235], text: [255, 255, 255] }
  };

  const st = statusConfig[wo.status] || { label: wo.status, bg: [100, 116, 139], text: [255, 255, 255] };
  const badgeW = 46;
  const badgeH = 16;
  const badgeX = margin + contentWidth - badgeW - 4;
  const badgeY = y + 5;

  doc.setFillColor(st.bg[0], st.bg[1], st.bg[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
  doc.setTextColor(st.text[0], st.text[1], st.text[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(wo.code, badgeX + badgeW / 2, badgeY + 6.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(st.label, badgeX + badgeW / 2, badgeY + 12, { align: 'center' });

  y += 30;

  // 2. METADATA CARDS GRID
  checkPageBreak(30);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  const colW = contentWidth / 3;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('FAZENDA / UNIDADE:', margin + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(wo.farm, margin + 4, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('EQUIPAMENTO / ATIVO:', margin + colW + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const equipLines = doc.splitTextToSize(wo.equipment || 'Equipamento Geral', colW - 8);
  doc.text(equipLines[0] || '', margin + colW + 4, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('LOCAL ESPECÍFICO:', margin + colW * 2 + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const locLines = doc.splitTextToSize(wo.location, colW - 8);
  doc.text(locLines[0] || '', margin + colW * 2 + 4, y + 9.5);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TIPO / PRIORIDADE:', margin + 4, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${wo.maintenanceType} • Prioridade: ${wo.priority}`, margin + 4, y + 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('INÍCIO DO SERVIÇO:', margin + colW + 4, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${wo.date} às ${wo.time || '08:00'}`, margin + colW + 4, y + 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CONCLUSÃO DO SERVIÇO:', margin + colW * 2 + 4, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (wo.status === 'CONCLUIDA') {
    doc.setTextColor(22, 101, 52);
    doc.text(`${wo.completionDate || wo.date} às ${wo.completionTime || '17:00'} (Finalizado)`, margin + colW * 2 + 4, y + 20.5);
  } else {
    doc.setTextColor(185, 28, 28);
    doc.text('Pendente de conclusão', margin + colW * 2 + 4, y + 20.5);
  }

  y += 27;

  // Terceiro / Responsável Bar
  checkPageBreak(12);
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text(`TÉCNICO EXECUTOR: ${wo.responsible}`, margin + 4, y + 5.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`EXECUÇÃO: ${wo.thirdParty || 'Equipe Interna Própria'} ${wo.isThirdParty ? '(Terceirizado)' : '(Interna)'}`, margin + contentWidth / 2, y + 5.2);

  y += 11;

  // Origin from Checklist (if any)
  if (wo.checklistItemDescription || wo.checklistSourceId) {
    checkPageBreak(12);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`VÍNCULO COM CHECKLIST: ${wo.checklistItemDescription || 'Apontamento técnico prévio'}`, margin + 4, y + 5.2);
    y += 11;
  }

  // 3. PROBLEMA DIAGNOSTICADO (Dynamic Box Height)
  const problemLines = doc.splitTextToSize(wo.problemDescription, contentWidth - 8);
  const problemBoxHeight = Math.max(16, problemLines.length * 4.2 + 9);
  checkPageBreak(problemBoxHeight + 4);

  doc.setFillColor(255, 251, 235); // Amber 50
  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.roundedRect(margin, y, contentWidth, problemBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('1. PROBLEMA DIAGNOSTICADO / MOTIVO DA SOLICITAÇÃO:', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(problemLines, margin + 4, y + 10.5);

  y += problemBoxHeight + 4;

  // 4. SOLUÇÃO APLICADA (Dynamic Box Height)
  const solText = wo.solutionDescription && wo.solutionDescription.trim()
    ? wo.solutionDescription.trim()
    : (wo.status === 'CONCLUIDA'
        ? 'Manutenção finalizada e testada com sucesso. Equipamento calibrado, limpo e liberado operacionalmente.'
        : 'Serviço técnico em andamento. Aguardando relatório final e registro de encerramento.');

  const solLines = doc.splitTextToSize(solText, contentWidth - 8);
  const solBoxHeight = Math.max(16, solLines.length * 4.2 + 9);
  checkPageBreak(solBoxHeight + 4);

  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.roundedRect(margin, y, contentWidth, solBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  doc.text('2. SOLUÇÃO APLICADA / PROCEDIMENTO TÉCNICO EXECUTADO:', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(solLines, margin + 4, y + 10.5);

  y += solBoxHeight + 4;

  // 5. MATERIAIS E PEÇAS UTILIZADAS
  checkPageBreak(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('3. MATERIAIS, PEÇAS E INSUMOS UTILIZADOS:', margin, y + 3);
  y += 5;

  if (wo.materials && wo.materials.length > 0) {
    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DESCRIÇÃO DO ITEM / MATERIAL', margin + 4, y + 4.2);
    doc.text('QUANTIDADE', margin + contentWidth - 45, y + 4.2);
    doc.text('UNIDADE', margin + contentWidth - 20, y + 4.2);

    y += 6;

    wo.materials.forEach((m, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(m.name, margin + 4, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.text(String(m.quantity), margin + contentWidth - 45, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(m.unit, margin + contentWidth - 20, y + 4.2);

      y += 6;
    });
    y += 4;
  } else {
    // Formal empty state box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum material, peça ou insumo avulso consumido nesta ordem de serviço.', margin + 4, y + 5.2);
    y += 12;
  }

  // 6. EVIDÊNCIAS FOTOGRÁFICAS (ANTES E DEPOIS)
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('4. EVIDÊNCIAS FOTOGRÁFICAS (ANTES E DEPOIS DA EXECUÇÃO):', margin, y + 3);
  y += 5;

  const photosBefore = wo.photosBefore || [];
  const photosAfter = wo.photosAfter || [];
  const hasPhotos = photosBefore.length > 0 || photosAfter.length > 0;

  if (hasPhotos) {
    const cardW = (contentWidth - 6) / 2;
    const imgHeight = 44;
    const cardH = imgHeight + 14;

    const maxPhotosCount = Math.max(photosBefore.length, photosAfter.length, 1);

    for (let i = 0; i < maxPhotosCount; i++) {
      checkPageBreak(cardH + 4);

      // --- Left Column: ANTES ---
      const pBefore = photosBefore[i];
      const leftX = margin;
      doc.setFillColor(255, 251, 235); // Amber 50
      doc.setDrawColor(252, 211, 77); // Amber 300
      doc.roundedRect(leftX, y, cardW, cardH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text(`FOTO DO PROBLEMA (ANTES) ${photosBefore.length > 1 ? `#${i + 1}` : ''}`, leftX + 3, y + 4.5);

      if (pBefore) {
        const rasterBefore = await loadAndRasterizeImage(pBefore.url, 500, 360);
        if (rasterBefore) {
          try {
            doc.addImage(rasterBefore, 'JPEG', leftX + 3, y + 6, cardW - 6, imgHeight);
          } catch (err) {
            console.warn('Could not add before image to pdf:', err);
          }
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 53, 15);
        const caption = pBefore.caption || pBefore.timestamp || 'Condição inicial do equipamento';
        doc.text(caption.substring(0, 55), leftX + 3, y + cardH - 1.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Sem foto registrada no momento da abertura.', leftX + 3, y + cardH / 2);
      }

      // --- Right Column: DEPOIS ---
      const pAfter = photosAfter[i];
      const rightX = margin + cardW + 6;
      doc.setFillColor(240, 253, 244); // Emerald 50
      doc.setDrawColor(167, 243, 208); // Emerald 200
      doc.roundedRect(rightX, y, cardW, cardH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87);
      doc.text(`FOTO DO REPARO (DEPOIS) ${photosAfter.length > 1 ? `#${i + 1}` : ''}`, rightX + 3, y + 4.5);

      if (pAfter) {
        const rasterAfter = await loadAndRasterizeImage(pAfter.url, 500, 360);
        if (rasterAfter) {
          try {
            doc.addImage(rasterAfter, 'JPEG', rightX + 3, y + 6, cardW - 6, imgHeight);
          } catch (err) {
            console.warn('Could not add after image to pdf:', err);
          }
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(6, 95, 70);
        const caption = pAfter.caption || pAfter.timestamp || 'Reparo finalizado e testado';
        doc.text(caption.substring(0, 55), rightX + 3, y + cardH - 1.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Foto de conclusão não anexada.', rightX + 3, y + cardH / 2);
      }

      y += cardH + 4;
    }
  } else {
    // When no photos exist
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma evidência fotográfica anexada a esta ordem de serviço.', margin + 4, y + 5.2);
    y += 12;
  }

  // 7. SIGNATURES AREA
  checkPageBreak(34);
  y += 12;

  const sigWidth = 72;
  // Left: Técnico
  doc.setDrawColor(71, 85, 105);
  doc.line(margin + 6, y, margin + 6 + sigWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(wo.responsible, margin + 6 + sigWidth / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Técnico Executor / Manutenção Mecânica & Elétrica', margin + 6 + sigWidth / 2, y + 8, { align: 'center' });
  doc.text(`Data: ${wo.completionDate || wo.date}`, margin + 6 + sigWidth / 2, y + 11.5, { align: 'center' });

  // Right: Gerente Manutenção
  const rightSigX = margin + contentWidth - 6 - sigWidth;
  doc.line(rightSigX, y, rightSigX + sigWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Gerente Manutenção', rightSigX + sigWidth / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Liberação Operacional do Ativo na Fazenda', rightSigX + sigWidth / 2, y + 8, { align: 'center' });
  doc.text('Visto de Aprovação Operacional', rightSigX + sigWidth / 2, y + 11.5, { align: 'center' });

  // 8. PAGE NUMBERING IN ALL PAGES
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, margin + contentWidth, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `el Ciruelo • Ordem de Serviço ${wo.code} • ${wo.farm} • Página ${i} de ${pageCount}`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Emitido eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      margin + contentWidth,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  const farmClean = wo.farm.replace(/\s+/g, '_');
  doc.save(`Ordem_de_Servico_${wo.code}_${farmClean}.pdf`);
}

/**
 * Generates an official, uncropped, multi-page vector PDF for a Checklist.
 * Includes header branding, inspectors, compliance metrics, dynamic notes,
 * verified items table, item photos gallery, signatures, and page numbers.
 */
export async function exportChecklistToPdf(checklist: ChecklistRecord, workOrders: WorkOrder[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 12;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`el Ciruelo • Checklist: ${checklist.code} - ${checklist.farm} (Continuação)`, margin, y);
    y += 3.5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
  };

  // 1. TOP BRAND HEADER
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('EL CIRUELO • GESTÃO E MANUTENÇÃO OPERACIONAL', margin + 6, y + 8);

  doc.setFontSize(11);
  doc.setTextColor(209, 250, 229);
  doc.text(`FICHA TÉCNICA OPERACIONAL DE CHECKLIST: ${CHECKLIST_TYPE_LABELS[checklist.type]}`, margin + 6, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(167, 243, 208);
  const headerSub = checklist.type === 'DRONE'
    ? `Fazenda: ${checklist.farm} • Drone: ${checklist.droneModel || 'DJI Agrícola'} • Operador: ${checklist.inspector}`
    : `Fazenda: ${checklist.farm} • Local: ${checklist.location} • Turno: ${checklist.shift || 'Geral'}`;
  doc.text(headerSub, margin + 6, y + 21);

  // Status Badge on top-right
  const effectiveStatus = getChecklistEffectiveStatus(checklist, workOrders);
  let statusBadgeText = '100% CONFORME';
  let badgeColor = [16, 185, 129]; // Emerald

  if (effectiveStatus.isFullyConforming && effectiveStatus.resolvedNCCount > 0) {
    statusBadgeText = 'REGULARIZADO (OS)';
    badgeColor = [5, 150, 105];
  } else if (!effectiveStatus.isFullyConforming) {
    statusBadgeText = `${effectiveStatus.activeNCCount} PENDÊNCIA(S)`;
    badgeColor = [220, 38, 38];
  }

  const badgeW = 46;
  const badgeH = 16;
  const badgeX = margin + contentWidth - badgeW - 4;
  const badgeY = y + 5;

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(checklist.code, badgeX + badgeW / 2, badgeY + 6.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(statusBadgeText, badgeX + badgeW / 2, badgeY + 12, { align: 'center' });

  y += 30;

  // 2. METADATA CARDS
  const isVehicle = checklist.type === 'VEICULO';
  const isDrone = checklist.type === 'DRONE';
  const cardHeight = isVehicle ? 24 : (isDrone ? 20 : 14);
  checkPageBreak(cardHeight + 4);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

  const colW = contentWidth / 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(isVehicle ? 'CONDUTOR / RESPONSÁVEL:' : (isDrone ? 'OPERADOR DO DRONE:' : 'INSPETOR RESPONSÁVEL:'), margin + 4, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(checklist.inspector, margin + 4, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DATA E HORÁRIO DA INSPEÇÃO:', margin + colW + 4, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${checklist.date} às ${checklist.time}`, margin + colW + 4, y + 9.5);

  const totalItems = checklist.items.length;
  const conformingCount = checklist.items.filter(i => i.status === 'C').length + effectiveStatus.resolvedNCCount;
  const compliancePercent = totalItems > 0 ? Math.round((conformingCount / totalItems) * 100) : 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ÍNDICE DE CONFORMIDADE:', margin + colW * 2 + 4, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(compliancePercent >= 80 ? 22 : 185, compliancePercent >= 80 ? 101 : 28, compliancePercent >= 80 ? 52 : 28);
  doc.text(`${compliancePercent}% (${conformingCount}/${totalItems} conformes)`, margin + colW * 2 + 4, y + 9.5);

  if (isVehicle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('VEÍCULO (PLACA / MODELO):', margin + 4, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${checklist.vehiclePlate || 'N/A'} - ${checklist.vehicleModel || 'Frota'}`, margin + 4, y + 20.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('QUILOMETRAGEM INICIAL:', margin + colW + 4, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(checklist.initialKm ? `${checklist.initialKm} KM` : 'Não informada', margin + colW + 4, y + 20.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('QUILOMETRAGEM FINAL:', margin + colW * 2 + 4, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(checklist.finalKm ? `${checklist.finalKm} KM` : 'Em uso / Não informada', margin + colW * 2 + 4, y + 20.5);
  } else if (isDrone) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('DRONE IDENTIFICAÇÃO / MODELO:', margin + 4, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(checklist.droneModel || 'DJI Agrícola / Pulverização', margin + 4, y + 19);
  }

  y += cardHeight + 4;

  // 3. GENERAL NOTES (Dynamic Height)
  if (checklist.generalNotes && checklist.generalNotes.trim()) {
    const notesLines = doc.splitTextToSize(checklist.generalNotes.trim(), contentWidth - 8);
    const notesBoxHeight = Math.max(14, notesLines.length * 4.2 + 8);
    checkPageBreak(notesBoxHeight + 4);

    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(margin, y, contentWidth, notesBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text('OBSERVAÇÕES GERAIS DA INSPEÇÃO TÉCNICA:', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.text(notesLines, margin + 4, y + 9.5);

    y += notesBoxHeight + 4;
  }

  // 4. ITEMS TABLE
  checkPageBreak(16);
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Nº', margin + 3, y + 4.8);
  doc.text('DESCRIÇÃO DO ITEM / PONTO INSPECIONADO', margin + 12, y + 4.8);
  doc.text('STATUS', margin + contentWidth - 62, y + 4.8);
  doc.text('APONTAMENTO / REGULARIZAÇÃO', margin + contentWidth - 42, y + 4.8);

  y += 7;

  checklist.items.forEach((item, idx) => {
    const resolvedInfo = isChecklistItemResolved(item, checklist, workOrders);
    let statusText = 'CONFORME';
    let statusColor = [22, 101, 52]; // Green

    if (item.status === 'N/C') {
      if (resolvedInfo.isAcknowledged) {
        statusText = 'N/C ACEITO';
        statusColor = [5, 150, 105];
      } else if (resolvedInfo.isResolved) {
        statusText = 'CORRIGIDO';
        statusColor = [5, 150, 105];
      } else {
        statusText = 'NÃO CONF.';
        statusColor = [185, 28, 28];
      }
    } else if (item.status === 'N/A') {
      statusText = 'N/A';
      statusColor = [100, 116, 139];
    }

    let noteExtra = item.notes || '-';
    if (resolvedInfo.isAcknowledged) {
      const ackNote = item.acknowledgementJustification ? ` | ${item.acknowledgementJustification}` : '';
      noteExtra = item.notes ? `${item.notes} • ` : '';
      noteExtra += `Aceite Gerente Manutenção (${item.acknowledgedAt || 'Registrado'}${ackNote})`;
    } else if (resolvedInfo.isResolved && resolvedInfo.linkedWorkOrder) {
      noteExtra += ` (OS ${resolvedInfo.linkedWorkOrder.code} Concluída)`;
    }

    const descLines = doc.splitTextToSize(item.description, contentWidth - 76);
    const noteLines = doc.splitTextToSize(noteExtra, 40);
    const rowHeight = Math.max(descLines.length, noteLines.length) * 4.2 + 4;

    checkPageBreak(rowHeight + 2);

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), margin + 3, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(descLines, margin + 12, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusText, margin + contentWidth - 62, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(noteLines, margin + contentWidth - 42, y + 4);

    y += rowHeight;
  });

  y += 4;

  // 5. PHOTOGRAPHIC EVIDENCE IN CHECKLIST
  const itemsWithPhotos = checklist.items.filter(i => i.photoUrl && i.photoUrl.trim());
  if (itemsWithPhotos.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('EVIDÊNCIAS FOTOGRÁFICAS DOS ITENS INSPECIONADOS:', margin, y + 3);
    y += 5;

    const photoCardW = (contentWidth - 6) / 2;
    const photoImgH = 40;
    const photoCardH = photoImgH + 14;

    for (let i = 0; i < itemsWithPhotos.length; i += 2) {
      checkPageBreak(photoCardH + 4);

      // Photo 1
      const item1 = itemsWithPhotos[i];
      const x1 = margin;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x1, y, photoCardW, photoCardH, 1.5, 1.5, 'FD');

      const raster1 = await loadAndRasterizeImage(item1.photoUrl!, 460, 320);
      if (raster1) {
        try {
          doc.addImage(raster1, 'JPEG', x1 + 2.5, y + 4.5, photoCardW - 5, photoImgH);
        } catch (e) {
          console.warn('Checklist image add error', e);
        }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item1.description.substring(0, 48), x1 + 2.5, y + photoCardH - 2);

      // Photo 2 (if exists)
      if (i + 1 < itemsWithPhotos.length) {
        const item2 = itemsWithPhotos[i + 1];
        const x2 = margin + photoCardW + 6;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x2, y, photoCardW, photoCardH, 1.5, 1.5, 'FD');

        const raster2 = await loadAndRasterizeImage(item2.photoUrl!, 460, 320);
        if (raster2) {
          try {
            doc.addImage(raster2, 'JPEG', x2 + 2.5, y + 4.5, photoCardW - 5, photoImgH);
          } catch (e) {
            console.warn('Checklist image add error', e);
          }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(item2.description.substring(0, 48), x2 + 2.5, y + photoCardH - 2);
      }

      y += photoCardH + 4;
    }
  }

  // 5.1. VEHICLE VISUAL INSPECTION (4 ANGLES)
  if (isVehicle && checklist.vehicleVisual) {
    const visual = checklist.vehicleVisual;
    const angles = [
      { label: 'AVALIAÇÃO VISUAL: FRENTE', url: visual.front },
      { label: 'AVALIAÇÃO VISUAL: TRASEIRA', url: visual.rear },
      { label: 'AVALIAÇÃO VISUAL: LATERAL ESQUERDA', url: visual.leftSide },
      { label: 'AVALIAÇÃO VISUAL: LATERAL DIREITA', url: visual.rightSide }
    ].filter(a => !!a.url);

    if (angles.length > 0) {
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('AVALIAÇÃO VISUAL DO VEÍCULO (4 ÂNGULOS REGISTRADOS):', margin, y + 3);
      y += 5;

      const angleCardW = (contentWidth - 6) / 2;
      const angleImgH = 40;
      const angleCardH = angleImgH + 13;

      for (let i = 0; i < angles.length; i += 2) {
        checkPageBreak(angleCardH + 4);

        const a1 = angles[i];
        const x1 = margin;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x1, y, angleCardW, angleCardH, 1.5, 1.5, 'FD');

        if (a1.url) {
          const raster1 = await loadAndRasterizeImage(a1.url, 460, 320);
          if (raster1) {
            try {
              doc.addImage(raster1, 'JPEG', x1 + 2.5, y + 4, angleCardW - 5, angleImgH);
            } catch (e) {
              console.warn('Angle photo 1 failed', e);
            }
          }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text(a1.label, x1 + 2.5, y + angleCardH - 2);

        if (i + 1 < angles.length) {
          const a2 = angles[i + 1];
          const x2 = margin + angleCardW + 6;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(x2, y, angleCardW, angleCardH, 1.5, 1.5, 'FD');

          if (a2.url) {
            const raster2 = await loadAndRasterizeImage(a2.url, 460, 320);
            if (raster2) {
              try {
                doc.addImage(raster2, 'JPEG', x2 + 2.5, y + 4, angleCardW - 5, angleImgH);
              } catch (e) {
                console.warn('Angle photo 2 failed', e);
              }
            }
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(30, 41, 59);
          doc.text(a2.label, x2 + 2.5, y + angleCardH - 2);
        }

        y += angleCardH + 4;
      }
    }
  }

  // 6. SIGNATURES AREA
  checkPageBreak(40);
  y += 18;

  const sigWidth = 72;

  // Digital signature on-screen capture (if available)
  if (checklist.signatureUrl) {
    try {
      doc.addImage(checklist.signatureUrl, 'PNG', margin + 6 + 11, y - 17, sigWidth - 22, 16);
    } catch (err) {
      console.warn('Could not draw signature on PDF', err);
    }
  }

  // Left: Inspetor / Condutor
  doc.setDrawColor(71, 85, 105);
  doc.line(margin + 6, y, margin + 6 + sigWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(checklist.inspector, margin + 6 + sigWidth / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const leftRole = isVehicle
    ? 'Condutor / Responsável'
    : (isDrone ? 'Operador / Piloto do Drone' : 'Inspetor / Técnico de Campo Responsável');
  doc.text(leftRole, margin + 6 + sigWidth / 2, y + 8, { align: 'center' });
  doc.text(`Data: ${checklist.date} às ${checklist.time}`, margin + 6 + sigWidth / 2, y + 11.5, { align: 'center' });

  // Right: Gerente Manutenção
  const rightSigX = margin + contentWidth - 6 - sigWidth;
  doc.line(rightSigX, y, rightSigX + sigWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Gerente Manutenção', rightSigX + sigWidth / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Visto de Aprovação Operacional', rightSigX + sigWidth / 2, y + 8, { align: 'center' });
  doc.text('Liberação e Controle de Conformidade', rightSigX + sigWidth / 2, y + 11.5, { align: 'center' });

  // 7. PAGE NUMBERING IN ALL PAGES
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, margin + contentWidth, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `el Ciruelo • Checklist ${checklist.code} • ${checklist.farm} • Página ${i} de ${pageCount}`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Emitido eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      margin + contentWidth,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  const farmClean = checklist.farm.replace(/\s+/g, '_');
  doc.save(`Ficha_Checklist_${checklist.code}_${farmClean}.pdf`);
}
