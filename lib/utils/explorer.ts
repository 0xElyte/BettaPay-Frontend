import { STELLAR_NETWORK } from './constants';

export type StellarNetwork = 'testnet' | 'public';

/** Normalizes any Stellar network string (env, store, user input) to the explorer's vocabulary. */
export function normalizeStellarNetwork(raw?: string | null): StellarNetwork {
  const v = (raw ?? '').toLowerCase().trim();
  return v === 'public' || v === 'mainnet' ? 'public' : 'testnet';
}

/** Build-time fallback when the caller has no runtime network (SSR / disconnected). */
export function resolveExplorerNetwork(): StellarNetwork {
  return normalizeStellarNetwork(STELLAR_NETWORK);
}

export function getStellarExplorerTxUrl(txHash: string, network?: StellarNetwork | string | null): string {
  const n = normalizeStellarNetwork(network ?? resolveExplorerNetwork());
  return `https://stellar.expert/explorer/${n}/tx/${encodeURIComponent(txHash)}`;
}

export function getStellarExplorerAccountUrl(address: string, network?: StellarNetwork | string | null): string {
  const n = normalizeStellarNetwork(network ?? resolveExplorerNetwork());
  return `https://stellar.expert/explorer/${n}/account/${encodeURIComponent(address)}`;
}
