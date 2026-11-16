/**
 * Cloud Live Sync Relay
 * Provides 100% automatic, real-time zero-configuration background synchronization
 * between mobile devices in the field and the desktop admin PC without QR codes.
 */

import { ChecklistRecord, WorkOrder } from '../types';

const APPLET_ID = 'b4169aef5e91';
const SYNC_TOPIC = `agrocheck_live_${APPLET_ID}`;
const RELAY_URL = 'https://ntfy.sh';

export interface SyncMessage {
  id: string;
  type:
    | 'CHECKLIST_SAVED'
    | 'WORK_ORDER_SAVED'
    | 'CHECKLIST_DELETED'
    | 'WORK_ORDER_DELETED'
    | 'BATCH_SYNC'
    | 'ITEM_DELETED'
    | 'CLEAR_TESTS'
    | 'FLEET_UPDATE_SAVED'
    | 'FLEET_UPDATE_DELETED'
    | 'SERVICE_REQUEST_SAVED'
    | 'SERVICE_REQUEST_DELETED'
    | 'OPERATOR_RELEASE_SAVED'
    | 'OPERATOR_RELEASE_DELETED'
    | 'DRONE_SAVED'
    | 'DRONE_DELETED'
    | 'FUEL_LOG_SAVED'
    | 'FUEL_LOG_DELETED'
    | 'FUEL_RULE_SAVED'
    | 'FUEL_RULE_DELETED';
  timestamp: string;
  sourceDevice: string;
  data: any;
}

class CloudLiveSyncService {
  private eventSource: EventSource | null = null;
  private isListening = false;
  private onMessageCallback: ((msg: SyncMessage) => void) | null = null;
  private processedMessageIds = new Set<string>();
  private localDeviceId = `dev_${Math.random().toString(36).substring(2, 9)}`;

  /**
   * Publish an update automatically in the background
   */
  public async publish(
    type: SyncMessage['type'],
    data: any
  ): Promise<boolean> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.processedMessageIds.add(messageId);

    const syncMessage: SyncMessage = {
      id: messageId,
      type,
      timestamp: new Date().toISOString(),
      sourceDevice: this.localDeviceId,
      data
    };

    const jsonString = JSON.stringify(syncMessage);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // If smaller than 3800 bytes, send inline in message body
      if (jsonString.length < 3800) {
        await fetch(`${RELAY_URL}/${SYNC_TOPIC}`, {
          method: 'POST',
          headers: {
            'Title': `elCiruelo:${type}`,
            'Tags': 'tractor,clipboard',
            'Priority': 'default'
          },
          body: jsonString,
          signal: controller.signal
        });
      } else {
        // Large payload with photos: send as binary JSON attachment
        await fetch(`${RELAY_URL}/${SYNC_TOPIC}`, {
          method: 'PUT',
          headers: {
            'Filename': `sync_${type.toLowerCase()}.json`,
            'Title': `elCiruelo:${type}`,
            'Tags': 'tractor,camera',
            'Priority': 'default'
          },
          body: jsonString,
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);
      return true;
    } catch (err) {
      console.warn('[CloudLiveSync] Failed to publish update automatically:', err);
      return false;
    }
  }

  /**
   * Listen in real-time via Server-Sent Events (SSE)
   */
  public startListening(onMessage: (msg: SyncMessage) => void) {
    this.onMessageCallback = onMessage;
    if (this.isListening) return;

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      // 1. Open continuous real-time SSE stream (pollRecentUpdates removed to prevent mobile thread blocking)
      this.eventSource = new EventSource(`${RELAY_URL}/${SYNC_TOPIC}/sse`);
      this.isListening = true;

      this.eventSource.onmessage = async (event) => {
        try {
          if (!event.data) return;
          const raw = JSON.parse(event.data);

          // Ignore keepalive or topic events
          if (raw.event !== 'message') return;

          let payload: SyncMessage | null = null;

          if (raw.attachment?.url) {
            // Download large payload JSON with strict 4s timeout
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 4000);
              const res = await fetch(raw.attachment.url, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                payload = await res.json();
              }
            } catch (fetchErr) {
              console.warn('[CloudLiveSync] Attachment fetch timeout/error, ignoring:', fetchErr);
            }
          } else if (raw.message) {
            try {
              payload = JSON.parse(raw.message);
            } catch {
              // Not JSON message
            }
          }

          if (payload && payload.id) {
            // Ignore messages published by this device itself
            if (payload.sourceDevice === this.localDeviceId) return;
            if (this.processedMessageIds.has(payload.id)) return;

            this.processedMessageIds.add(payload.id);
            if (this.onMessageCallback) {
              this.onMessageCallback(payload);
            }
          }
        } catch (err) {
          console.warn('[CloudLiveSync] Error handling incoming SSE:', err);
        }
      };

      this.eventSource.onerror = () => {
        // Reconnection is handled automatically by native EventSource
      };
    } catch (err) {
      console.warn('[CloudLiveSync] Could not initialize SSE stream:', err);
    }
  }

  /**
   * Poll for past messages (e.g., when PC opens after mobile created records)
   */
  public async pollRecentUpdates(sinceMinutes: number = 30) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${RELAY_URL}/${SYNC_TOPIC}/json?poll=1&since=${sinceMinutes}m`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return;

      const text = await res.text();
      const lines = text.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const raw = JSON.parse(line);
          if (raw.event !== 'message') continue;

          let payload: SyncMessage | null = null;
          if (raw.attachment?.url) {
            try {
              const attCtrl = new AbortController();
              const attTimer = setTimeout(() => attCtrl.abort(), 4000);
              const fileRes = await fetch(raw.attachment.url, { signal: attCtrl.signal });
              clearTimeout(attTimer);
              if (fileRes.ok) {
                payload = await fileRes.json();
              }
            } catch {
              // ignore timed-out attachment
            }
          } else if (raw.message) {
            payload = JSON.parse(raw.message);
          }

          if (payload && payload.id) {
            if (payload.sourceDevice === this.localDeviceId) continue;
            if (this.processedMessageIds.has(payload.id)) continue;

            this.processedMessageIds.add(payload.id);
            if (this.onMessageCallback) {
              this.onMessageCallback(payload);
            }
          }
        } catch {
          // ignore single line error
        }
      }
    } catch (err) {
      console.warn('[CloudLiveSync] Polling recent error:', err);
    }
  }

  public stopListening() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isListening = false;
  }
}

export const cloudLiveSync = new CloudLiveSyncService();
