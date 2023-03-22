export function camelToKekab(text: string): string {
    return text.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function kebabToCamel(text: string): string {
    return text.toLowerCase().replace(/-+(.)/g, (_: string, chr: string) => chr.toUpperCase());
}

export function camelToSnake(text: string): string {
    return text.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(text: string): string {
    return text.toLowerCase().replace(/_+(.)/g, (_: string, chr: string) => chr.toUpperCase());
}
