export interface Store {
  storeId: number;
  uniqueName: string;
  adapterName;
  settings: any;
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
}
