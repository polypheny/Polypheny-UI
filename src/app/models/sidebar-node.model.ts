export class SidebarNode{
  id:any;// of the form "schema.table.column"
  name:string;
  icon:string;
  routerLink:string;
  cssClass: string;
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

  getSchema(){
    return this.id.split('.')[0];
  }
  getTable(){
    return this.id.split('.')[0] + '.' + this.id.split('.')[1];
  }
  getColumn(){
    return this.id.split('.')[2];
  }


}

export interface JavaPage {
  id:any;
  name:string;
  icon:string;
}
