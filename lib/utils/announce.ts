let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestMessage = '';

export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('announcer');
  if (!el) return;

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
