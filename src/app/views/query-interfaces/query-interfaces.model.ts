export interface QueryInterface {
    uniqueName: string;
    supportsDdl: boolean;
    supportsDml: boolean;
    interfaceType: string;
    availableSettings: QueryInterfaceSetting[];
    currentSettings: Map<string, string>;
}

export interface QueryInterfaceInformation {
    interfaceName: string;
    description: string;
    availableSettings: QueryInterfaceSetting[];
}

export interface QueryInterfaceSetting {
    name: string;
    canBeNull: boolean;
    required: boolean;
    modifiable: boolean;
    defaultValue: string;
    options: string[];
}

export interface QueryInterfaceCreateRequest {
    interfaceName: string;
    uniqueName: string;
    settings: Map<string, string>;
}
