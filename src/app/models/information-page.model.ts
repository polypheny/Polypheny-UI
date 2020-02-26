export interface InformationPage {
  mansonry?: boolean;
  groups: Map<string, InformationGroup>;
  name?: string;
  id?: string;
  description?: string;
}

export interface InformationGroup {
  color?: string;
  informationObjects: InformationObject[];
}

export interface InformationObject {
  type?: string;
  label?: string;
  routerLink?: any;
  button?: any[];
  badge?: string;
  isCollapsed?: boolean;
  items?: any[];
  color?: string;
  value?: any;
  min?: number;
  max?: number;
  step?: number;
  html?: string;
  //config
  webUiGroup?: string;
  key?: string;
  //information
  id?: string;
  groupId?: string;
  //graph:
  data?: any;
  labels?: string[];
  graphType?: string;
  //debugger
  queryPlan: string;
  //code
  code?: string;
  language?: string;
  //table
  rows?: string[];
}

export interface InformationResponse {
  errorMsg?: string;
  successMsg?: string;
}
