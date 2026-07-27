function base64UrlDecode(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  if (typeof atob === 'function') {
    return atob(padded);
  }

  const binary = Uint8Array.from(padded, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(binary);
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts');
  }

  const payloadJson = base64UrlDecode(parts[1]);
  return JSON.parse(payloadJson);
}
