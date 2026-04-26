export interface BufferConfig {
  maxSize: number;
  strategy: 'drop-oldest';
  onOverflow?: (dropped: number) => void;
}

export class CircularBuffer<T> {
  private data: T[] = [];
  private readonly config: BufferConfig;
  private droppedCount = 0;

  constructor(config: BufferConfig) {
    this.config = config;
  }

  push(item: T): void {
    if (this.data.length >= this.config.maxSize) {
      this.data.shift();
      this.droppedCount++;
      this.config.onOverflow?.(this.droppedCount);
    }
    this.data.push(item);
  }

  get items(): readonly T[] {
    return this.data;
  }

  get length(): number {
    return this.data.length;
  }

  get totalDropped(): number {
    return this.droppedCount;
  }

  clear(): void {
    this.data = [];
    this.droppedCount = 0;
  }
}
