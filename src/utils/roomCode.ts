/** Codigo numerico de 6 digitos usado para crear/unirse a una sala. */
export function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
