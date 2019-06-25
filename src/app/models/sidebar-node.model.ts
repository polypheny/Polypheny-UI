export class SidebarNode{
  id:any;
  name:string;
  icon:string;
  routerLink:string;
  children: SidebarNode[];
  constructor ( id, name, icon, routerLink ){
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.routerLink = routerLink;
  }
  setChildren ( children: SidebarNode[] ) {
    this.children = children;
  }
}

export interface JavaPage {
  id:any;
  name:string;
  icon:string;
}
