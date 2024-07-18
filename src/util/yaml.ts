import * as YAML from "yaml";

export function stringify(data: any): string {
    return YAML.stringify(data, {doubleQuotedAsJSON: true, indent: 2, lineWidth: 200});
}

export function parse<T>(data: string): T {
    return YAML.parse(data);
}
