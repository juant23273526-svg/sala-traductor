let unlocked = false;

/**
 * Reproduce un audio silencioso dentro de un gesto de usuario real (tap en
 * Crear/Unirse Sala o en el boton de microfono) para desbloquear la
 * reproduccion programatica posterior. Necesario para que el audio
 * traducido que llega por WebSocket — sin gesto propio del receptor — se
 * reproduzca automaticamente (politica de autoplay de Safari/iOS).
 */
export function unlockAudioPlayback(): void {
  if (unlocked) return;
  unlocked = true;
  const silence = new Audio(
    'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQAAAABAA=='
  );
  silence.play().catch(() => {});
}
