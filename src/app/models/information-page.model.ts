import {ResultException} from '../components/data-view/models/result-set.model';

export interface InformationPage {
  mansonry?: boolean;
  groups: Map<string, InformationGroup>;
  name?: string;
  id?: string;
  description?: string;
  refreshable: boolean;
  fullWidth?: boolean;
}

export interface InformationGroup {
  color?: string;
  informationObjects: InformationObject[];
  refreshable: boolean;
}

export interface InformationObject extends Duration {
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
  colors?: string[];
  graphType?: string;
  //debugger
  queryPlan: string;
  //code
  code?: string;
  language?: string;
  //table
  rows?: string[];
  //InformationDuration
  //=> extended by Duration interface
  //action
  parameters: any;
  //exception
  exception: ResultException;
  //keyValuePair
  keyValuePairs: Map<string, string>;
  //InformationText
  text: string;
}

export interface InformationResponse {
  errorMsg?: string;
  successMsg?: string;
}

export interface Duration {
  name: string;
  duration: number;
  limit: number;
  sequence: number;
  isChild: boolean;
  children: Duration[];//Durations map
  noProgressBar: boolean;
}
