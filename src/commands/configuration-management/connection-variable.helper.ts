import { PackageManagerVariableType } from "../studio/interfaces/package-manager.interfaces";
import { VariableExportTransport, VariableManifestTransport } from "./interfaces/package-export.interfaces";

export function fixConnectionVariables(variables: VariableManifestTransport[]): VariableManifestTransport[] {
    return variables.map(variableManifest => ({
        ...variableManifest,
        variables: variableManifest.variables.map(variable => {
            if (variable.type !== PackageManagerVariableType.CONNECTION) {
                return variable;
            }

            return fixConnectionVariable(variable);
        })
    }));
}

function fixConnectionVariable(variable: VariableExportTransport): VariableExportTransport {
    if (!variable.value?.appName) {
        return variable;
    }

    return {
        ...variable,
        metadata: {
            ...variable.metadata,
            appName: variable.value.appName
        }
    };
}
