/**
 * WalletConnect v2 session manager for Stellar.
 *
 * Implements the WalletConnect v2 relay protocol over a plain WebSocket —
 * no SDK required. The flow follows the WalletConnect 2.0 spec:
 *
 *   1. Generate a random symmetric key (topic + key for the pairing).
 *   2. Build a `wc:` URI containing the relay URL and the symmetric key.
 *   3. Subscribe to the pairing topic on the relay.
 *   4. The mobile wallet scans the QR code, connects to the relay, and sends
 *      a `wc_sessionPropose` request encrypted with the pairing key.
 *   5. We approve the proposal, negotiate a session topic + key, and
 *      receive the wallet's Stellar account(s).
 *   6. For signing, we send a `stellar_signTransaction` JSON-RPC request on
 *      the session topic and receive the signed XDR back.
 *
 * Encryption uses AES-256-GCM via Web Crypto (available in all modern
 * browsers and Next.js Edge/Node runtimes ≥ 18).
 *
 * Reference: https://specs.walletconnect.com/2.0/
 */

import { extractValidStellarAddresses } from './utils';
import {
  WALLETCONNECT_RELAY_URL,
  WALLETCONNECT_PROJECT_ID,
  SITE_URL,
} from '@/lib/config';

// ─── Constants ────────────────────────────────────────────────────────────────

const RELAY_URL = WALLETCONNECT_RELAY_URL;

const PROJECT_ID = WALLETCONNECT_PROJECT_ID;

/** CAIP-2 chain identifier for Stellar */
const STELLAR_CHAIN = 'stellar:testnet';

/** WalletConnect relay JSON-RPC method */
const RELAY_PUBLISH = 'irn_publish';
const RELAY_SUBSCRIBE = 'irn_subscribe';
const RELAY_SUBSCRIPTION = 'irn_subscription';

/** App-level WalletConnect methods */
const METHOD_SESSION_PROPOSE = 'wc_sessionPropose';
const METHOD_SESSION_SETTLE = 'wc_sessionSettle';
const METHOD_SESSION_REQUEST = 'wc_sessionRequest';
const METHOD_STELLAR_SIGN_TX = 'stellar_signTransaction';
const METHOD_STELLAR_SIGN_MSG = 'stellar_signMessage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletConnectSession {
  topic: string;
  peerMetadata: WCPeerMetadata;
  stellarAccounts: string[];
  /** Primary Stellar G-address derived from the session */
  address: string;
}

interface WCPeerMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

interface WCRelayMessage {
  id: number;
  jsonrpc: '2.0';
  method?: string;
  result?: unknown;
  error?: { code: number; message: string };
  params?: unknown;
}

interface WCEncryptedEnvelope {
  /** Base64url-encoded ciphertext */
  message: string;
  /** Base64url-encoded 12-byte IV */
  iv: string;
  /** Base64url-encoded 32-byte raw symmetric key */
  symKey: string;
  /** Encryption type — 0 = AES-256-GCM */
  type: number;
  /** Key version/derivation counter */
  version: number;
}

export type WalletConnectStatus =
  | 'idle'
  | 'connecting'        // WebSocket open, waiting for wallet to scan
  | 'approving'         // session_proposal received, sending settle
  | 'connected'         // session active
  | 'signing'           // waiting for sign response
  | 'disconnected'
  | 'error';

export type StatusListener = (status: WalletConnectStatus, detail?: string) => void;

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function generateSymKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

async function encrypt(
  plaintext: string,
  key: CryptoKey,
  version: number,
): Promise<WCEncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const rawKey = await exportRawKey(key);
  return {
    message: toBase64url(new Uint8Array(cipherBuf)),
    iv: toBase64url(iv),
    symKey: toBase64url(rawKey),
    type: 0,
    version,
  };
}

async function decrypt(envelope: WCEncryptedEnvelope, key: CryptoKey): Promise<string> {
  const iv = fromBase64url(envelope.iv);
  const ciphertext = fromBase64url(envelope.message);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  return new TextDecoder().decode(plainBuf);
}

// ─── Base64url helpers ────────────────────────────────────────────────────────

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── WalletConnect client ─────────────────────────────────────────────────────

export class WalletConnectClient {
  private ws: WebSocket | null = null;
  private pairingTopic: string = '';
  private pairingKey: CryptoKey | null = null;
  private pairingKeyVersion: number = 0;
  private sessionTopic: string = '';
  private sessionKey: CryptoKey | null = null;
  private sessionKeyVersion: number = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  /** Tracks used (version, iv) pairs per topic to detect IV reuse */
  private usedIvs = new Map<string, Set<string>>();
  private rpcId = 1;
  private statusListener: StatusListener | null = null;
  private sessionListener: ((session: WalletConnectSession) => void) | null = null;

  // ── Public API ──────────────────────────────────────────────────────────────

  onStatus(cb: StatusListener) {
    this.statusListener = cb;
  }

  onSession(cb: (session: WalletConnectSession) => void) {
    this.sessionListener = cb;
  }

  /**
   * Begin a new pairing. Returns the `wc:` URI to encode in the QR code.
   */
  async connect(): Promise<string> {
    this.cleanup();
    this.emit('connecting');

    // Generate a fresh pairing topic + symmetric key
    this.pairingTopic = randomHex(32);
    this.pairingKey = await generateSymKey();
    this.pairingKeyVersion = 0;
    const rawKey = await exportRawKey(this.pairingKey);

    // Build the wc: URI per WC v2 spec
    // wc:<topic>@2?relay-protocol=irn&symKey=<hex>&projectId=<id>
    const symKeyHex = Array.from(rawKey, (b) => b.toString(16).padStart(2, '0')).join('');
    const relayParam = encodeURIComponent(JSON.stringify({ protocol: 'irn' }));
    const uri =
      `wc:${this.pairingTopic}@2` +
      `?relay-protocol=irn` +
      `&symKey=${symKeyHex}` +
      (PROJECT_ID ? `&projectId=${PROJECT_ID}` : '');

    void relayParam; // kept for reference; encoded into QR URI above

    // Open relay WebSocket
    const wsUrl = `${RELAY_URL}?projectId=${PROJECT_ID}&ua=BettaPay%2F1.0`;
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => this.onWsOpen();
    this.ws.onmessage = (ev) => void this.onWsMessage(ev.data as string);
    this.ws.onerror = () => this.emit('error', 'Relay connection failed');
    this.ws.onclose = () => {
      if (this.sessionTopic === '') this.emit('disconnected');
    };

    return uri;
  }

  /**
   * Sign a Stellar transaction XDR via the active WalletConnect session.
   * Returns the signed XDR string.
   */
  async signTransaction(xdr: string): Promise<string> {
    return this.sendSessionRequest<string>(METHOD_STELLAR_SIGN_TX, { xdr });
  }

  /**
   * Sign a plaintext challenge via the active WalletConnect session.
   * Returns the base64-encoded signature string.
   */
  async signMessage(message: string, address: string): Promise<string> {
    return this.sendSessionRequest<string>(METHOD_STELLAR_SIGN_MSG, {
      message,
      address,
    });
  }

  /** Disconnect and clean up. */
  disconnect() {
    this.cleanup();
    this.emit('disconnected');
  }

  // ── WebSocket lifecycle ─────────────────────────────────────────────────────

  private onWsOpen() {
    // Subscribe to the pairing topic so we receive session proposals
    this.relayRpc(RELAY_SUBSCRIBE, { topic: this.pairingTopic });
  }

  private async onWsMessage(raw: string) {
    let msg: WCRelayMessage;
    try {
      msg = JSON.parse(raw) as WCRelayMessage;
    } catch {
      return;
    }

    // Relay publish acknowledgement — nothing to do
    if (msg.result !== undefined && !msg.method) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.resolve(msg.result);
        this.pendingRequests.delete(msg.id);
      }
      return;
    }

    if (msg.error) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.reject(new Error(msg.error.message));
        this.pendingRequests.delete(msg.id);
      }
      return;
    }

    if (msg.method !== RELAY_SUBSCRIPTION) return;

    const subscriptionData = msg.params as {
      id: string;
      data: { topic: string; message: string; publishedAt: number };
    };

    const { topic, message: encMessage } = subscriptionData.data;

    // Determine which key to use for decryption
    let decrypted: string;
    try {
      if (topic === this.pairingTopic && this.pairingKey) {
        const envelope = JSON.parse(encMessage) as WCEncryptedEnvelope;
        const version = envelope.version ?? 0;
        // Validate IV has not been reused with this key version
        if (!this.trackIv(topic, version, envelope.iv)) {
          console.error('IV reuse detected on pairing topic');
          return;
        }
        decrypted = await decrypt(envelope, this.pairingKey);
      } else if (topic === this.sessionTopic && this.sessionKey) {
        const envelope = JSON.parse(encMessage) as WCEncryptedEnvelope;
        const version = envelope.version ?? 0;
        // Validate IV has not been reused with this key version
        if (!this.trackIv(topic, version, envelope.iv)) {
          console.error('IV reuse detected on session topic');
          return;
        }
        decrypted = await decrypt(envelope, this.sessionKey);
      } else {
        // Unknown topic — ignore
        return;
      }
    } catch {
      // Decryption failed — possibly a relay heartbeat or unrelated message
      return;
    }

    let payload: WCRelayMessage;
    try {
      payload = JSON.parse(decrypted) as WCRelayMessage;
    } catch {
      return;
    }

    await this.handleAppMessage(topic, payload);
  }

  // ── App-level message handling ──────────────────────────────────────────────

  private async handleAppMessage(topic: string, msg: WCRelayMessage) {
    const method = msg.method;

    if (method === METHOD_SESSION_PROPOSE) {
      await this.handleSessionProposal(topic, msg);
      return;
    }

    if (method === METHOD_SESSION_SETTLE) {
      this.handleSessionSettle(msg);
      return;
    }

    if (method === METHOD_SESSION_REQUEST) {
      // Responses to our outbound sign requests arrive here
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
        this.pendingRequests.delete(msg.id);
      }
      return;
    }
  }

  private async handleSessionProposal(
    _pairingTopic: string,
    msg: WCRelayMessage,
  ) {
    this.emit('approving');

    const proposal = msg.params as {
      id: number;
      proposer: { publicKey: string; metadata: WCPeerMetadata };
      relays: Array<{ protocol: string }>;
      requiredNamespaces: Record<string, unknown>;
    };

    // Generate a new session topic + key with version 0
    this.sessionTopic = randomHex(32);
    this.sessionKey = await generateSymKey();
    this.sessionKeyVersion = 0;
    const rawSessionKey = await exportRawKey(this.sessionKey);
    const sessionKeyHex = Array.from(rawSessionKey, (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');

    // Subscribe to the session topic
    this.relayRpc(RELAY_SUBSCRIBE, { topic: this.sessionTopic });

    // Build the settle response: echo back the proposer's requested
    // namespaces with dummy accounts — the real accounts arrive in
    // wc_sessionSettle from the wallet.
    const settlePayload = {
      id: this.nextId(),
      jsonrpc: '2.0' as const,
      method: METHOD_SESSION_SETTLE,
      params: {
        relay: { protocol: 'irn' },
        controller: {
          publicKey: sessionKeyHex,
          metadata: {
            name: 'BettaPay',
            description: 'Non-custodial merchant payments',
            url: SITE_URL,
            icons: [],
          },
        },
        namespaces: {
          stellar: {
            accounts: [],
            methods: [METHOD_STELLAR_SIGN_TX, METHOD_STELLAR_SIGN_MSG],
            events: [],
            chains: [STELLAR_CHAIN],
          },
        },
        expiry: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        acknowledged: false,
        pairingTopic: this.pairingTopic,
      },
    };

    // Send settle encrypted with the session key to the session topic
    await this.publishEncrypted(
      this.sessionTopic,
      this.sessionKey,
      this.sessionKeyVersion,
      JSON.stringify(settlePayload),
    );

    // Acknowledge the proposal on the pairing topic
    const ack = {
      id: proposal.id,
      jsonrpc: '2.0' as const,
      result: {
        relay: { protocol: 'irn' },
        responderPublicKey: sessionKeyHex,
      },
    };
    await this.publishEncrypted(
      this.pairingTopic,
      this.pairingKey!,
      this.pairingKeyVersion,
      JSON.stringify(ack),
    );
  }

  private handleSessionSettle(msg: WCRelayMessage) {
    const settle = msg.params as {
      namespaces: {
        stellar?: {
          accounts: string[]; // "stellar:testnet:G..."
        };
      };
      controller: { metadata: WCPeerMetadata };
    };

    const stellarNS = settle?.namespaces?.stellar;
    const rawAccounts: string[] = stellarNS?.accounts ?? [];

    // Extract and validate Stellar addresses from CAIP-2 format
    const stellarAccounts = extractValidStellarAddresses(rawAccounts);

    if (stellarAccounts.length === 0) {
      this.emit('error', 'No Stellar accounts found in WalletConnect session');
      return;
    }

    const session: WalletConnectSession = {
      topic: this.sessionTopic,
      peerMetadata: settle.controller?.metadata ?? {
        name: 'Unknown Wallet',
        description: '',
        url: '',
        icons: [],
      },
      stellarAccounts,
      address: stellarAccounts[0],
    };

    this.emit('connected');
    this.sessionListener?.(session);
  }

  // ── Signing ─────────────────────────────────────────────────────────────────

  private async sendSessionRequest<T>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    if (!this.sessionKey || !this.sessionTopic) {
      throw new Error('No active WalletConnect session');
    }
    this.emit('signing');

    const id = this.nextId();
    const payload = {
      id,
      jsonrpc: '2.0' as const,
      method: METHOD_SESSION_REQUEST,
      params: {
        request: { method, params },
        chainId: STELLAR_CHAIN,
      },
    };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: (v) => {
          this.emit('connected');
          resolve(v as T);
        },
        reject: (e) => {
          this.emit('connected');
          reject(e);
        },
      });

      this.publishEncrypted(
        this.sessionTopic,
        this.sessionKey!,
        this.sessionKeyVersion,
        JSON.stringify(payload),
      ).catch(reject);
    });
  }

  // ── Relay transport helpers ─────────────────────────────────────────────────

  private relayRpc(method: string, params: unknown): void {
    const msg: WCRelayMessage = {
      id: this.nextId(),
      jsonrpc: '2.0',
      method,
      params,
    };
    this.ws?.send(JSON.stringify(msg));
  }

  private async publishEncrypted(
    topic: string,
    key: CryptoKey,
    version: number,
    plaintext: string,
  ): Promise<void> {
    const envelope = await encrypt(plaintext, key, version);
    this.relayRpc(RELAY_PUBLISH, {
      topic,
      message: JSON.stringify(envelope),
      ttl: 86400,
      tag: 0,
    });
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  /** Track and validate IV for a given topic and key version to detect reuse */
  private trackIv(topic: string, version: number, iv: string): boolean {
    const key = `${topic}:${version}`;
    if (!this.usedIvs.has(key)) {
      this.usedIvs.set(key, new Set());
    }
    const ivSet = this.usedIvs.get(key)!;
    if (ivSet.has(iv)) {
      // IV reuse detected
      return false;
    }
    ivSet.add(iv);
    return true;
  }

  private emit(status: WalletConnectStatus, detail?: string) {
    this.statusListener?.(status, detail);
  }

  private nextId(): number {
    return this.rpcId++;
  }

  private cleanup() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.pairingTopic = '';
    this.pairingKey = null;
    this.pairingKeyVersion = 0;
    this.sessionTopic = '';
    this.sessionKey = null;
    this.sessionKeyVersion = 0;
    this.pendingRequests.clear();
    this.usedIvs.clear();
    this.rpcId = 1;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

// One client instance per browser page — avoids multiple open WebSockets.
let _client: WalletConnectClient | null = null;

export function getWalletConnectClient(): WalletConnectClient {
  if (typeof window === 'undefined') {
    throw new Error('WalletConnectClient is only available in the browser');
  }
  if (!_client) _client = new WalletConnectClient();
  return _client;
}

export function resetWalletConnectClient() {
  _client?.disconnect();
  _client = null;
}
