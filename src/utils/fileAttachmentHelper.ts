import { DocumentAttachment } from '../types';

/**
 * Reads a File (PDF or image) and returns a clean DocumentAttachment object
 */
export async function processUploadedFile(
  file: File, 
  tag?: string
): Promise<DocumentAttachment> {
  return new Promise((resolve, reject) => {
    // Limit max file size to 15MB to prevent memory crashes
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      reject(new Error(`O arquivo excede o limite máximo permitido de 15MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const attachment: DocumentAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: result,
        uploadedAt: new Date().toISOString(),
        tag
      };
      resolve(attachment);
    };

    reader.onerror = () => {
      reject(new Error('Erro ao processar o arquivo. Tente novamente.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human readable string (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Triggers browser download for a DocumentAttachment
 */
export function downloadAttachment(attachment: DocumentAttachment) {
  try {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.fileName || 'documento_anexo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Falha ao baixar anexo:', err);
  }
}

/**
 * Open attachment in a new browser tab / preview
 */
export function openAttachmentInNewTab(attachment: DocumentAttachment) {
  try {
    const win = window.open();
    if (win) {
      if (attachment.mimeType.includes('pdf')) {
        win.document.write(`
          <title>${attachment.fileName}</title>
          <body style="margin:0;background:#1e293b;display:flex;flex-direction:column;height:100vh;">
            <div style="background:#0f172a;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-family:sans-serif;">
              <span style="font-weight:bold;">📄 ${attachment.fileName} (${formatFileSize(attachment.fileSize)})</span>
              <a href="${attachment.dataUrl}" download="${attachment.fileName}" style="background:#059669;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:bold;">Baixar Arquivo</a>
            </div>
            <iframe src="${attachment.dataUrl}" style="border:none;flex:1;width:100%;"></iframe>
          </body>
        `);
      } else {
        win.document.write(`
          <title>${attachment.fileName}</title>
          <body style="margin:0;background:#0f172a;display:flex;flex-direction:column;height:100vh;align-items:center;justify-content:center;">
            <img src="${attachment.dataUrl}" style="max-width:95%;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);" />
          </body>
        `);
      }
    }
  } catch (e) {
    console.error('Erro ao abrir em nova aba:', e);
  }
}
