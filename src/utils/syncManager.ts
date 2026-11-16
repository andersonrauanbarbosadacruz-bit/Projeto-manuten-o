import LZString from 'lz-string';
import { Peer } from 'peerjs';
import { ChecklistRecord, VehicleMonthlyUpdate, WorkOrder } from '../types';

export const ADMIN_PEER_ID = 'agrocheck-admin-b4169aef';

export interface SyncPayload {
  version: number;
  timestamp: string;
  source: string;
  checklists?: ChecklistRecord[];
  workOrders?: WorkOrder[];
  fleetMonthlyUpdates?: VehicleMonthlyUpdate[];
}

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class SyncManager {
  private peer: any = null;
  private connections: any[] = [];
  private onDataCallback: ((payload: SyncPayload) => void) | null = null;
  private onStatusChangeCallback: ((status: PeerStatus, message?: string) => void) | null = null;
  private role: 'ADMIN' | 'OPERADOR' = 'ADMIN';

  public init(role: 'ADMIN' | 'OPERADOR', onData: (payload: SyncPayload) => void, onStatusChange?: (status: PeerStatus, message?: string) => void) {
    this.role = role;
    this.onDataCallback = onData;
    this.onStatusChangeCallback = onStatusChange || null;

    if (typeof window === 'undefined') return;

    try {
      this.cleanup();

      if (role === 'ADMIN') {
        // Admin acts as the host peer receiver
        this.peer = new Peer(ADMIN_PEER_ID, {
          debug: 1
        });

        this.peer.on('open', (id: string) => {
          this.notifyStatus('connected', `Pronto para receber dados do celular (ID: ${id})`);
        });

        this.peer.on('connection', (conn: any) => {
          this.setupAdminConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          // If ID is already taken (e.g. page refreshed), fallback to a client peer
          if (err.type === 'unavailable-id') {
            this.peer = new Peer({ debug: 1 });
            this.peer.on('open', () => {
              this.notifyStatus('connected', 'Canal P2P ativo como receptor');
            });
            this.peer.on('connection', (conn: any) => this.setupAdminConnection(conn));
          } else {
            this.notifyStatus('disconnected', err.message || 'Canal offline');
          }
        });
      } else {
        // Mobile acts as client connector to Admin
        this.peer = new Peer({
          debug: 1
        });

        this.peer.on('open', () => {
          this.connectToAdmin();
        });

        this.peer.on('error', (err: any) => {
          this.notifyStatus('disconnected', err.message);
        });
      }
    } catch (err: any) {
      console.warn('[SyncManager] Peer init exception:', err);
    }
  }

  private connectToAdmin() {
    if (!this.peer || this.role !== 'OPERADOR') return;
    this.notifyStatus('connecting', 'Conectando ao computador Admin...');

    const conn = this.peer.connect(ADMIN_PEER_ID, {
      reliable: true
    });

    conn.on('open', () => {
      this.connections = [conn];
      this.notifyStatus('connected', 'Conectado diretamente ao PC do Admin');
    });

    conn.on('close', () => {
      this.connections = [];
      this.notifyStatus('disconnected', 'Desconectado do PC do Admin');
      // Retry in 8 seconds
      setTimeout(() => this.connectToAdmin(), 8000);
    });

    conn.on('error', () => {
      this.connections = [];
      this.notifyStatus('disconnected', 'Aguardando Admin abrir o painel no PC');
    });
  }

  private setupAdminConnection(conn: any) {
    conn.on('open', () => {
      this.connections.push(conn);
      this.notifyStatus('connected', `Celular conectado (${this.connections.length} ativo)`);
    });

    conn.on('data', (raw: any) => {
      try {
        if (this.onDataCallback && raw) {
          this.onDataCallback(raw as SyncPayload);
        }
      } catch (e) {
        console.error('[SyncManager] Error handling incoming peer data:', e);
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      this.notifyStatus(this.connections.length > 0 ? 'connected' : 'disconnected');
    });
  }

  public sendToAdmin(payload: SyncPayload): boolean {
    if (this.connections.length === 0) return false;
    let sent = false;
    for (const conn of this.connections) {
      if (conn && conn.open) {
        try {
          conn.send(payload);
          sent = true;
        } catch (err) {
          console.warn('[SyncManager] Send peer error:', err);
        }
      }
    }
    return sent;
  }

  public broadcastToClients(payload: SyncPayload) {
    for (const conn of this.connections) {
      if (conn && conn.open) {
        try {
          conn.send(payload);
        } catch {
          // ignore
        }
      }
    }
  }

  public notifyStatus(status: PeerStatus, message?: string) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status, message);
    }
  }

  public cleanup() {
    try {
      this.connections.forEach(c => c.close && c.close());
      this.connections = [];
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
    } catch {
      // ignore
    }
  }
}

export const syncManager = new SyncManager();

// Helper to strip heavy base64 photos from QR/URL payload (photos can never fit in a QR code anyway)
export function createLightweightSyncPayload(payload: SyncPayload): SyncPayload {
  return {
    version: payload.version || 1,
    timestamp: payload.timestamp || new Date().toISOString(),
    source: payload.source || 'elCiruelo',
    checklists: (payload.checklists || []).map(c => ({
      ...c,
      signatureUrl: undefined,
      vehicleVisual: undefined,
      items: (c.items || []).map(i => ({
        ...i,
        photoUrl: undefined
      }))
    })),
    workOrders: (payload.workOrders || []).map(w => ({
      ...w,
      photosBefore: [],
      photosAfter: [],
      beforePhotos: [],
      afterPhotos: []
    })),
    fleetMonthlyUpdates: (payload.fleetMonthlyUpdates || []).map(u => ({
      ...u,
      visualInspection: {},
      incidentPhotos: []
    }))
  };
}

// Encode arbitrary data into compact URL-safe string
export function encodeSyncPayload(payload: SyncPayload): string {
  try {
    const cleanPayload = createLightweightSyncPayload(payload);
    const json = JSON.stringify(cleanPayload);
    return LZString.compressToEncodedURIComponent(json);
  } catch (err) {
    console.error('Failed to encode sync payload:', err);
    return '';
  }
}

// Decode compressed URL-safe string back to SyncPayload
export function decodeSyncPayload(compressed: string): SyncPayload | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to decode sync payload:', err);
    return null;
  }
}

// Generate full shareable link with payload
export function generateSyncShareUrl(payload: SyncPayload, baseUrl?: string): string {
  const host = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const encoded = encodeSyncPayload(payload);
  return `${host}/?import_sync=${encoded}`;
}
