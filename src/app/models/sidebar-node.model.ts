export class SidebarNode {
  id: any;// of the form "schema.table.column"
  name: string;
  tableType: string;
  icon: string;
  relAlgSymbol: string;
  routerLink: any;
  label: string;
  allowRouting = true;
  cssClass: string;
  allowDrag = false;
  children: SidebarNode[] = [];
  isSeparator = false;
  action: (tree, node, $event) => any = null;
  private autoExpand = true;
  private autoActive = true;

  constructor(id, name, icon = null, routerLink: any = null, allowDrag = false) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.routerLink = routerLink;
    this.allowDrag = allowDrag;
  }

  /**
   * generate an instance of the SidebarNode class from a parsed JSON object
   * @param obj parsed JSON object
   * @param settings Settings that should be applied to all generated SidebarNodes
   */
  static fromJson(obj, settings = {}) {
    const sidebarNode = new SidebarNode(obj.id, obj.name);
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key === 'action') {
          continue;
        } else if (key === 'children' && sidebarNode.children) {
          sidebarNode.children = [];
          for (const c of obj.children) {
            sidebarNode.children.push(this.fromJson(c, settings));
          }
        } else {
          sidebarNode[key] = obj[key];
          for (const k in settings) {
            if (settings.hasOwnProperty(k)) {
              sidebarNode[k] = settings[k];
            }
          }
        }
      }
    }
    return sidebarNode;
  }

  setChildren(children: SidebarNode[]) {
    this.children = children;
  }

  getSchema() {
    return this.id.split('.')[0];
  }

  getTable() {
    return this.id.split('.')[0] + '.' + this.id.split('.')[1];
  }

  getColumn() {
    return this.id.split('.')[2];
  }

  asSeparator() {
    this.isSeparator = true;
    return this;
  }

  setAction(action: (tree, node, $event) => any) {
    this.action = action;
    return this;
  }

  setAutoExpand(autoExpand: boolean) {
    this.autoExpand = autoExpand;
    return this;
  }

  setAutoActive(autoActive: boolean) {
    this.autoActive = autoActive;
    return this;
  }

  disableRouting() {
    this.allowRouting = false;
    return this;
  }

  isAutoExpand() {
    return this.autoExpand;
  }

  isAutoActive() {
    return this.autoActive;
  }

  setRelAlgSymbol(symbol: string) {
    this.relAlgSymbol = symbol;
    this.icon = null;
    return this;
  }
}

export interface JavaPage {
  id: any;
  name: string;
  icon: string;
  label: string;
}
