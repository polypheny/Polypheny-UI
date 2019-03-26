export interface RenderObj {
  mansonry?: boolean;
  items: RenderGroup[];
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
}
export interface RenderGroup {
  color?: string;
  list: RenderItem[];
}
