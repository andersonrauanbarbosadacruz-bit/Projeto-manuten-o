import { ChecklistRecord, WorkOrder, CHECKLIST_TYPE_LABELS } from '../types';
import { getChecklistEffectiveStatus, isChecklistItemResolved } from './complianceHelper';

function triggerBlobDownload(htmlContent: string, filename: string) {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function openPrintWindow(htmlContent: string) {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      // If popup was blocked by browser or iframe constraints, trigger download directly!
      triggerBlobDownload(htmlContent, 'documento_impressao.html');
    }
  } catch {
    triggerBlobDownload(htmlContent, 'documento_impressao.html');
  }
}

export function downloadChecklistDocument(checklist: ChecklistRecord, workOrders: WorkOrder[]) {
  const effectiveStatus = getChecklistEffectiveStatus(checklist, workOrders);
  const farmClean = checklist.farm.replace(/\s+/g, '_');
  const filename = `Ficha_Checklist_${checklist.code}_${farmClean}.html`;

  const conformingCount = checklist.items.filter(i => i.status === 'C').length + effectiveStatus.resolvedNCCount;
  const totalItems = checklist.items.length;
  const compliancePercent = totalItems > 0 ? Math.round((conformingCount / totalItems) * 100) : 100;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha Técnica - ${checklist.code} - ${checklist.farm}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f8fafc; }
    .page-container { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .print-bar { display: flex; align-items: center; justify-content: space-between; background: #064e3b; color: #ffffff; padding: 14px 20px; border-radius: 10px; margin-bottom: 24px; }
    .print-btn { background: #10b981; color: #ffffff; font-weight: bold; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
    .print-btn:hover { background: #059669; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-conforme { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-regularizado { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-pendencia { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-card { background: #f1f5f9; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 2px; }
    .info-val { font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #1e293b; color: #ffffff; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
    td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .status-c { color: #15803d; font-weight: bold; }
    .status-nc { color: #b91c1c; font-weight: bold; }
    .status-na { color: #64748b; }
    .resolved-tag { display: inline-block; font-size: 10px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 14px; }
    .photo-card { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fff; page-break-inside: avoid; }
    .photo-card img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .photo-caption { padding: 8px; font-size: 11px; color: #334155; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #334155; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #1e293b; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page-container { border: none; padding: 0; max-width: 100%; }
      .print-bar { display: none !important; }
      tr, .photo-card, .signatures { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="print-bar">
      <div>
        <strong style="font-size: 15px;">Ficha Pronta para Impressão ou Salvar como PDF</strong>
        <div style="font-size: 12px; opacity: 0.9;">Clique no botão ao lado ou use Ctrl+P no seu teclado.</div>
      </div>
      <button class="print-btn" onclick="window.print()">
        🖨️ Imprimir / Salvar em PDF
      </button>
    </div>

    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="font-size: 12px; font-weight: bold; color: #880e4f; text-transform: uppercase;">🍇 el Ciruelo • Relatório de Inspeção Técnica</span>
          <h1 style="margin: 4px 0 2px 0; font-size: 22px; color: #0f172a;">${CHECKLIST_TYPE_LABELS[checklist.type]}</h1>
          <div style="font-size: 13px; color: #475569;">Fazenda: <strong>${checklist.farm}</strong>${checklist.type === 'DRONE' ? ` • Drone: <strong>${checklist.droneModel || 'DJI Agrícola'}</strong>` : ` • Setor/Local: <strong>${checklist.location}</strong>`}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${checklist.code}</div>
          <span class="badge ${effectiveStatus.isFullyConforming ? (effectiveStatus.resolvedNCCount > 0 ? 'badge-regularizado' : 'badge-conforme') : 'badge-pendencia'}">
            ${effectiveStatus.isFullyConforming ? (effectiveStatus.resolvedNCCount > 0 ? '✓ Regularizado / Aceito' : '✓ 100% Conforme') : '⚠️ Com Pendências'}
          </span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-card">
        <div class="info-label">${checklist.type === 'VEICULO' ? 'Condutor / Responsável' : (checklist.type === 'DRONE' ? 'Operador do Drone' : 'Inspetor Responsável')}</div>
        <div class="info-val">${checklist.inspector}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Data e Horário da Inspeção</div>
        <div class="info-val">${checklist.date} às ${checklist.time} (${checklist.shift || 'Geral'})</div>
      </div>
      <div class="info-card">
        <div class="info-label">Índice de Conformidade Operacional</div>
        <div class="info-val">${compliancePercent}% (${conformingCount} de ${totalItems} itens conformes)</div>
      </div>
      <div class="info-card">
        <div class="info-label">Status das Pendências (N/C)</div>
        <div class="info-val">${effectiveStatus.activeNCCount === 0 ? 'Nenhuma pendência ativa' : `${effectiveStatus.activeNCCount} pendência(s) em aberto`}</div>
      </div>
      ${checklist.type === 'VEICULO' ? `
      <div class="info-card">
        <div class="info-label">Veículo da Frota (Placa / Modelo)</div>
        <div class="info-val">${checklist.vehiclePlate || 'N/A'} - ${checklist.vehicleModel || 'Frota'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Quilometragem (KM Inicial e Final)</div>
        <div class="info-val">Inicial: ${checklist.initialKm || '-'} km • Final: ${checklist.finalKm || '-'} km</div>
      </div>
      ` : ''}
      ${checklist.type === 'DRONE' ? `
      <div class="info-card" style="grid-column: span 2;">
        <div class="info-label">Identificação / Prefixo do Drone Agrícola</div>
        <div class="info-val">${checklist.droneModel || 'DJI Agrícola / Pulverização'}</div>
      </div>
      ` : ''}
    </div>

    ${checklist.generalNotes ? `
    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 6px; font-size: 12px; margin-bottom: 16px;">
      <strong style="color: #92400e;">Observações Gerais da Inspeção:</strong>
      <div style="color: #78350f; margin-top: 2px;">${checklist.generalNotes}</div>
    </div>
    ` : ''}

    <h2 style="font-size: 14px; text-transform: uppercase; color: #1e293b; margin: 20px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      Tabela de Itens Verificados
    </h2>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">Item</th>
          <th>Descrição do Ponto Inspecionado</th>
          <th style="width: 110px; text-align: center;">Resultado</th>
          <th>Observação Técnica / Vínculo de Reparo</th>
        </tr>
      </thead>
      <tbody>
        ${checklist.items.map((item, idx) => {
          const resolvedInfo = isChecklistItemResolved(item, checklist, workOrders);
          let statusText = 'CONFORME';
          let statusClass = 'status-c';
          if (item.status === 'N/C') {
            if (resolvedInfo.isAcknowledged) {
              statusText = 'N/C ACEITO';
              statusClass = 'status-c';
            } else if (resolvedInfo.isResolved) {
              statusText = 'CORRIGIDO';
              statusClass = 'status-c';
            } else {
              statusText = 'NÃO CONFORME';
              statusClass = 'status-nc';
            }
          } else if (item.status === 'N/A') {
            statusText = 'N/A';
            statusClass = 'status-na';
          }

          return `
          <tr>
            <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
            <td><strong>${item.description}</strong></td>
            <td style="text-align: center;"><span class="${statusClass}">[ ${statusText} ]</span></td>
            <td>
              ${item.notes || '-'}
              ${resolvedInfo.isAcknowledged ? `
                <br/><span class="resolved-tag" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">✓ Aceite Gerente Manutenção (${item.acknowledgedAt || 'Registrado'}${item.acknowledgementJustification ? ` - ${item.acknowledgementJustification}` : ''})</span>
              ` : resolvedInfo.isResolved && resolvedInfo.linkedWorkOrder ? `
                <br/><span class="resolved-tag">✓ Reparado via OS: ${resolvedInfo.linkedWorkOrder.code} (${resolvedInfo.linkedWorkOrder.completionDate || 'Concluída'})</span>
              ` : ''}
            </td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    ${checklist.type === 'VEICULO' && checklist.vehicleVisual && (checklist.vehicleVisual.front || checklist.vehicleVisual.rear || checklist.vehicleVisual.leftSide || checklist.vehicleVisual.rightSide) ? `
    <h2 style="font-size: 14px; text-transform: uppercase; color: #1e293b; margin: 28px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      Avaliação Visual do Veículo (4 Ângulos Obrigatórios)
    </h2>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 14px;">
      ${checklist.vehicleVisual.front ? `
        <div class="photo-card">
          <img src="${checklist.vehicleVisual.front}" alt="Frente" style="height: 180px; object-fit: cover;" />
          <div class="photo-caption" style="font-weight: bold; text-align: center;">AVALIAÇÃO VISUAL: FRENTE</div>
        </div>
      ` : ''}
      ${checklist.vehicleVisual.rear ? `
        <div class="photo-card">
          <img src="${checklist.vehicleVisual.rear}" alt="Traseira" style="height: 180px; object-fit: cover;" />
          <div class="photo-caption" style="font-weight: bold; text-align: center;">AVALIAÇÃO VISUAL: TRASEIRA</div>
        </div>
      ` : ''}
      ${checklist.vehicleVisual.leftSide ? `
        <div class="photo-card">
          <img src="${checklist.vehicleVisual.leftSide}" alt="Lateral Esquerda" style="height: 180px; object-fit: cover;" />
          <div class="photo-caption" style="font-weight: bold; text-align: center;">AVALIAÇÃO VISUAL: LATERAL ESQUERDA</div>
        </div>
      ` : ''}
      ${checklist.vehicleVisual.rightSide ? `
        <div class="photo-card">
          <img src="${checklist.vehicleVisual.rightSide}" alt="Lateral Direita" style="height: 180px; object-fit: cover;" />
          <div class="photo-caption" style="font-weight: bold; text-align: center;">AVALIAÇÃO VISUAL: LATERAL DIREITA</div>
        </div>
      ` : ''}
    </div>
    ` : ''}

    ${checklist.items.some(i => i.photoUrl) ? `
    <h2 style="font-size: 14px; text-transform: uppercase; color: #1e293b; margin: 28px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      Evidências Fotográficas Registradas em Campo
    </h2>
    <div class="photo-grid">
      ${checklist.items.filter(i => i.photoUrl).map(item => `
        <div class="photo-card">
          <img src="${item.photoUrl}" alt="${item.description}" />
          <div class="photo-caption">
            <strong>${item.description}</strong>
            ${item.notes ? `<div style="color: #64748b; font-size: 10px; margin-top: 2px;">${item.notes}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="signatures">
      <div>
        ${checklist.signatureUrl ? `
          <div style="text-align: center; margin-bottom: 6px;">
            <img src="${checklist.signatureUrl}" alt="Assinatura Digital" style="max-height: 55px; display: inline-block;" />
          </div>
        ` : ''}
        <div class="sig-line">
          ${checklist.inspector}<br/>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">${checklist.type === 'VEICULO' ? 'Condutor / Responsável' : (checklist.type === 'DRONE' ? 'Operador / Piloto do Drone' : 'Técnico / Inspetor Responsável')}</span>
        </div>
      </div>
      <div>
        <div class="sig-line" style="margin-top: ${checklist.signatureUrl ? '61px' : '0'};">
          Gerente Manutenção<br/>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">Visto de Aprovação Operacional</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  triggerBlobDownload(html, filename);
}

export function downloadWorkOrderDocument(wo: WorkOrder) {
  const farmClean = wo.farm.replace(/\s+/g, '_');
  const filename = `Ordem_de_Servico_${wo.code}_${farmClean}.html`;

  const priorityColors: Record<string, string> = {
    URGENTE: '#ef4444',
    ALTA: '#f59e0b',
    MEDIA: '#3b82f6',
    BAIXA: '#64748b'
  };

  const statusLabels: Record<string, string> = {
    ABERTA: 'Aberta / Pendente',
    EM_ANDAMENTO: 'Em Andamento',
    CONCLUIDA: 'Concluída / Reparo Finalizado',
    CANCELADA: 'Cancelada'
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ordem de Serviço - ${wo.code} - ${wo.equipment}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f8fafc; }
    .page-container { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .print-bar { display: flex; align-items: center; justify-content: space-between; background: #854d0e; color: #ffffff; padding: 14px 20px; border-radius: 10px; margin-bottom: 24px; }
    .print-btn { background: #eab308; color: #1c1917; font-weight: bold; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
    .print-btn:hover { background: #ca8a04; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-concluida { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-andamento { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-aberta { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-card { background: #f1f5f9; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 2px; }
    .info-val { font-weight: 700; color: #0f172a; }
    .box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; }
    .box-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #1e293b; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .photos-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
    .photo-col { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .photo-col-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; display: block; }
    .photo-col img { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #334155; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #1e293b; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page-container { border: none; padding: 0; max-width: 100%; }
      .print-bar { display: none !important; }
      tr, .photos-comparison, .signatures { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="print-bar">
      <div>
        <strong style="font-size: 15px;">Ficha da OS Pronta para Impressão ou Salvar como PDF</strong>
        <div style="font-size: 12px; opacity: 0.9;">Clique no botão ao lado ou use Ctrl+P no seu teclado para imprimir.</div>
      </div>
      <button class="print-btn" onclick="window.print()">
        🖨️ Imprimir / Salvar em PDF
      </button>
    </div>

    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="font-size: 12px; font-weight: bold; color: #880e4f; text-transform: uppercase;">🍇 el Ciruelo • Ordem de Serviço Oficial</span>
          <h1 style="margin: 4px 0 2px 0; font-size: 22px; color: #0f172a;">${wo.equipment}</h1>
          <div style="font-size: 13px; color: #475569;">Fazenda: <strong>${wo.farm}</strong> • Localização: <strong>${wo.location}</strong></div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${wo.code}</div>
          <span class="badge ${wo.status === 'CONCLUIDA' ? 'badge-concluida' : (wo.status === 'EM_ANDAMENTO' ? 'badge-andamento' : 'badge-aberta')}">
            ${statusLabels[wo.status] || wo.status}
          </span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-card">
        <div class="info-label">Tipo e Prioridade</div>
        <div class="info-val">
          ${wo.maintenanceType} • <span style="color: ${priorityColors[wo.priority] || '#0f172a'};">${wo.priority}</span>
        </div>
      </div>
      <div class="info-card">
        <div class="info-label">Responsável Técnico</div>
        <div class="info-val">${wo.responsible} ${wo.thirdParty ? `(Empresa: ${wo.thirdParty})` : ''}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Abertura do Serviço</div>
        <div class="info-val">${wo.date} às ${wo.time || '08:00'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Conclusão do Serviço</div>
        <div class="info-val">
          ${wo.status === 'CONCLUIDA' ? `${wo.completionDate || wo.date} às ${wo.completionTime || '17:00'} (Finalizado)` : 'Pendente de conclusão'}
        </div>
      </div>
    </div>

    <div class="box" style="border-left: 4px solid #f59e0b; background: #fffdf5;">
      <div class="box-title" style="color: #b45309;">Problema Diagnosticado / Motivo da Solicitação:</div>
      <div style="color: #1e293b; line-height: 1.5;">${wo.problemDescription}</div>
    </div>

    ${wo.solutionDescription ? `
    <div class="box" style="border-left: 4px solid #10b981; background: #f0fdf4;">
      <div class="box-title" style="color: #047857;">Solução Aplicada e Procedimentos Realizados:</div>
      <div style="color: #1e293b; line-height: 1.5;">${wo.solutionDescription}</div>
    </div>
    ` : ''}

    ${wo.materials && wo.materials.length > 0 ? `
    <h2 style="font-size: 14px; text-transform: uppercase; color: #1e293b; margin: 20px 0 6px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      Peças, Insumos e Materiais Utilizados
    </h2>
    <table>
      <thead>
        <tr>
          <th>Descrição do Material / Peça</th>
          <th style="width: 100px; text-align: center;">Quantidade</th>
          <th style="width: 90px; text-align: center;">Unidade</th>
        </tr>
      </thead>
      <tbody>
        ${wo.materials.map(m => `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td style="text-align: center; font-weight: bold;">${m.quantity}</td>
            <td style="text-align: center; color: #64748b;">${m.unit}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${((wo.photosBefore && wo.photosBefore.length > 0) || (wo.photosAfter && wo.photosAfter.length > 0)) ? `
    <h2 style="font-size: 14px; text-transform: uppercase; color: #1e293b; margin: 24px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      Registro Fotográfico do Serviço (Antes e Depois)
    </h2>
    <div class="photos-comparison">
      <div class="photo-col">
        <span class="photo-col-title" style="color: #b45309;">📸 Fotos do Problema (Antes)</span>
        ${wo.photosBefore && wo.photosBefore.length > 0 ? wo.photosBefore.map(p => `
          <div>
            <img src="${p.url}" alt="Antes" />
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${p.caption || 'Condição inicial'}</div>
          </div>
        `).join('') : '<p style="font-size: 12px; color: #94a3b8;">Sem fotos registradas no momento da abertura.</p>'}
      </div>

      <div class="photo-col">
        <span class="photo-col-title" style="color: #15803d;">✨ Fotos do Reparo Concluído (Depois)</span>
        ${wo.photosAfter && wo.photosAfter.length > 0 ? wo.photosAfter.map(p => `
          <div>
            <img src="${p.url}" alt="Depois" />
            <div style="font-size: 11px; color: #15803d; font-weight: bold; margin-bottom: 6px;">${p.caption || 'Serviço finalizado'}</div>
          </div>
        `).join('') : '<p style="font-size: 12px; color: #94a3b8;">Fotos pós-reparo ainda não anexadas.</p>'}
      </div>
    </div>
    ` : ''}

    <div class="signatures">
      <div>
        <div class="sig-line">
          ${wo.responsible}<br/>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">Mecânico / Eletricista Executor</span>
        </div>
      </div>
      <div>
        <div class="sig-line">
          Gerente Manutenção<br/>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">Aceite Final e Liberação do Equipamento</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  triggerBlobDownload(html, filename);
}
