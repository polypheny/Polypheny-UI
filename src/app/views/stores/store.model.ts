export interface Store {
  storeId: number;
  uniqueName: string;
  adapterName;
  adapterSettings: AdapterSetting[];
  currentSettings: Map<string, string>;
  dataReadOnly: boolean;
  schemaReadOnly: boolean;
  persistent: boolean;
}

export interface AdapterInformation {
  name: string;
  description: string;
  clazz: string;
  adapterSettings: AdapterSetting[];
}

export interface AdapterSetting {
  name: string;
  defaultValue: string;
  canBeNull: boolean;
  required: boolean;
  modifiable: boolean;
  options: string[];
}
