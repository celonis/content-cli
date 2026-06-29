export function trimSlashes(value: string): string {
    return value.replace(/^\/+/, "").replace(/\/+$/, "");
}
