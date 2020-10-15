export interface QueryInterface {
  uniqueName: string;
  supportsDdl: boolean;
  supportsDml: boolean;
  interfaceType: string;
  availableSettings: QueryInterfaceSetting[];
  currentSettings: Map<string, string>;
}

export interface QueryInterfaceInformation {
  name: string;
  description: string;
  clazz: string;
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

export interface QueryInterfaceInformationRequest {
  clazzName: string;
  uniqueName: string;
  currentSettings: any;//Map<string, string>
}
