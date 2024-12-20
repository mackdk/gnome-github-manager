import { Disposable } from './Disposable';
import { readonlyMap } from './utilities';

export type EventListener<T extends unknown[]> = (...args: T) => void;

type UnknownEventListener = EventListener<unknown[]>;

export class EventDispatcher implements Disposable {
    private readonly eventListener: Map<string, Map<number, UnknownEventListener>>;

    private currentHandle: number;

    public constructor() {
        this.currentHandle = 1;
        this.eventListener = new Map<string, Map<number, UnknownEventListener>>();
    }

    public get eventListenersMap(): ReadonlyMap<string, Map<number, EventListener<unknown[]>>> {
        return readonlyMap(this.eventListener);
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
        const eventMap = this.eventListener.get(event);
        if (eventMap === undefined) {
            return false;
        }

        const result = eventMap.delete(listenerHandle);
        if (result && eventMap.size === 0) {
            this.eventListener.delete(event);
        }

        return result;
    }

    public dispose(): void {
        this.eventListener.clear();
    }

    public async emit<T extends unknown[]>(event: string, ...args: T): Promise<boolean> {
        const eventListeners = await Promise.resolve(this.eventListener.get(event));
        if (eventListeners === undefined) {
            return false;
        }

        eventListeners.forEach((listener) => listener(...args));
        return true;
    }
}
