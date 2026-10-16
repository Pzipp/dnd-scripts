/** Tilfældigt id (a-z0-9). Bruger getRandomValues, som også virker uden https. */
export function newId(bytes = 8): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
