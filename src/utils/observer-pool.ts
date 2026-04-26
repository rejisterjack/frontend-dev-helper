type MutationCallback = (mutations: MutationRecord[]) => void;

class MutationObserverPool {
  private observer: MutationObserver | null = null;
  private callbacks = new Set<MutationCallback>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMutations: MutationRecord[] = [];

  subscribe(callback: MutationCallback): () => void {
    if (this.callbacks.size === 0) {
      this.startObserver();
    }
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.stopObserver();
      }
    };
  }

  private startObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      this.pendingMutations.push(...mutations);
      if (!this.debounceTimer) {
        this.debounceTimer = setTimeout(() => {
          const batch = this.pendingMutations;
          this.pendingMutations = [];
          this.debounceTimer = null;
          this.callbacks.forEach(cb => cb(batch));
        }, 100);
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-component', 'data-testid', 'tabindex', 'name', 'type', 'required', 'pattern'],
    });
  }

  private stopObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingMutations = [];
  }
}

export const mutationObserverPool = new MutationObserverPool();
