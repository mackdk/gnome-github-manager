export type EventListener<T extends unknown[]> = (...args: T) => void;

type UnknownEventListener = EventListener<unknown[]>;

export class EventDispatcher {
    private currentHandle: number;

    private eventListener: Map<string, Map<number, UnknownEventListener>>;

    public constructor() {
        this.currentHandle = 1;
        this.eventListener = new Map<string, Map<number, UnknownEventListener>>();
    }

    public addEventListener<T extends unknown[]>(event: string, listener: EventListener<T>): number {
        let eventListeners = this.eventListener.get(event);
        if (eventListeners === undefined) {
            eventListeners = new Map<number, UnknownEventListener>();
            this.eventListener.set(event, eventListeners);
        }

        eventListeners.set(this.currentHandle, listener as UnknownEventListener);
        return this.currentHandle++;
    }

    public removeEventListener(event: string, listenerHandle: number): boolean {
        return this.eventListener.get(event)?.delete(listenerHandle) ?? false;
    }

    public async emit<T extends unknown[]>(event: string, ...args: T): Promise<boolean> {
        const eventListeners = await Promise.resolve(this.eventListener.get(event));
        if (eventListeners == undefined) {
            return false;
        }

        eventListeners.forEach((listener) => listener(...args));
        return true;
    }
}
