export type EventListener = (data?: unknown) => void;
export declare class EventEmitter {
    private eventListeners;
    /**
     * Subscribe to events
     */
    on(event: string, listener: EventListener): void;
    /**
     * Unsubscribe from events
     */
    off(event: string, listener: EventListener): void;
    /**
     * Emit events
     */
    protected emit(event: string, data?: unknown): void;
    /**
     * Clear all event listeners
     */
    removeAllListeners(event?: string): void;
    /**
     * Get number of listeners for event
     */
    listenerCount(event: string): number;
    /**
     * Get list of all events
     */
    eventNames(): string[];
}
//# sourceMappingURL=events.d.ts.map