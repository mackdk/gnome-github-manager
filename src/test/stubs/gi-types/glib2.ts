export function free(mem?: any | null): void {}

export function get_user_data_dir(): string {
    return '/user/data/dir';
}

const timersMap = new Map<number, NodeJS.Timeout>();
let index: number = 0;

export const PRIORITY_DEFAULT = 0;

export function timeout_add_seconds(_priority: number, interval: number, task: () => boolean): number {
    const currentIndex = index++;
    const timeout = setTimeout(() => {
        task();
        timersMap.delete(currentIndex);
    }, interval * 1000);
    timersMap.set(currentIndex, timeout);
    return currentIndex;
}

export function source_remove(handle: number): boolean {
    const timer = timersMap.get(handle);
    if (timer !== undefined) {
        clearTimeout(timer);
        timersMap.delete(handle);
    }

    return false;
}