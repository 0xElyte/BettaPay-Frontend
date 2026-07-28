let timeoutId: any = null;
let clearAnnouncerTimeoutId: any = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestMessage = '';

export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('announcer');
  if (!el) return;

  // Clear any pending debounced triggers
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  // Clear any scheduled text clearance timers
  if (clearAnnouncerTimeoutId) {
    clearTimeout(clearAnnouncerTimeoutId);
  }

  // Ensure announcer is configured for polite announcements
  el.setAttribute('aria-live', 'polite');

  // Debounce announcement trigger
  timeoutId = setTimeout(() => {
    // Clear live region text to announce clean changes
    el.textContent = '';
    
    // Focus screen reader's attention to the new message text
    setTimeout(() => {
      el.textContent = message;

      // Clear the live region so duplicate alerts can trigger subsequently
      clearAnnouncerTimeoutId = setTimeout(() => {
        el.textContent = '';
      }, 1000);
    }, 100);
  latestMessage = message;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    el.textContent = '';
    setTimeout(() => {
      el.textContent = latestMessage;
    }, 100);
    debounceTimer = null;
  }, 500);
}

