export interface Store {
  storeId: number;
  uniqueName: string;
  adapterName;
  settings: AdapterSetting[];
}

export interface AdapterInformation {
  name: string;
  description: string;
  clazz: string;
  settings: AdapterSetting[];
}

export interface AdapterSetting {
  name: string;
  defaultValue: string;
  canBeNull: boolean;
  required: boolean;
  modifiable: boolean;
  options: string[];
}
