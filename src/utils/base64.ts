export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Wraps a per-session TextDecoder so multi-byte UTF-8 chars split across chunks decode correctly. */
export function createStreamingDecoder() {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return {
    decode(base64: string): string {
      return decoder.decode(base64ToBytes(base64), { stream: true });
    },
  };
}
