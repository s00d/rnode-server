import { logger } from './logger';

export type EventListener = (data?: unknown) => void;

export class EventEmitter {
  private eventListeners: Map<string, EventListener[]> = new Map();

  /**
   * Subscribe to events
   */
  on(event: string, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, listener: EventListener): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit events
   */
  protected emit(event: string, data?: unknown): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)!;
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error(`❌ Error in event listener for ${event}: ${error}`, 'events');
        }
      });
    }
  }

  /**
   * Clear all event listeners
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  /**
   * Get number of listeners for event
   */
  listenerCount(event: string): number {
    return this.eventListeners.get(event)?.length || 0;
  }

  /**
   * Get list of all events
   */
  eventNames(): string[] {
    return Array.from(this.eventListeners.keys());
  }
}
