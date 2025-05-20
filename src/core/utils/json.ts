export function stringify(data: any): string {
    return JSON.stringify(data, replacer, 2);
}

export function parse<T>(data: string): T {
    return JSON.parse(data);
}

const replacer = (key, value) => {
    if (value instanceof Map) {
        return Object.fromEntries(value);
    }
    return value;
};
