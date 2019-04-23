export interface RenderObj {
  mansonry?: boolean;
  //groups: RenderGroup[];
  groups: Map<string, RenderGroup>;
  name?: string;
  id?: string;
  description?: string;
}
export interface RenderItem {
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
  webUiGroup?:string;
  key?:string;
  //information
  id?:string;
  informationGroup?:string;
  //graph:
  data?: number[];
  labels?: string[];
  graphType?:string;
}
export interface RenderGroup {
  color?: string;
  list: RenderItem[];
}
