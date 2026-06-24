export function trimSlashes(value: string): string {
    return value.replace(/^\/+|\/+$/g, "");
}
