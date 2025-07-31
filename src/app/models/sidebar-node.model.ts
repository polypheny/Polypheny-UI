import {TreeModel, TreeNode} from '@ali-hm/angular-tree-component';


export class SidebarNode {
    id: any;// of the form "schema.table.column"
    name: string;
    tableType: string;
    icon: string;
    algSymbol: string;
    routerLink: any;
    label: string;
    allowRouting = true;
    cssClass: string;
    allowDrag = false;
    allowDropFrom = false;
    allowDropTo = false;
    children: SidebarNode[] = [];
    isSeparator = false;
    dataModel: string;
    action: (tree, node, $event) => any = null;
    private dropAction: (tree: TreeModel, node: TreeNode, $event: any, {from, to}: {
        from: any;
        to: any
    }) => any = null;
    private autoExpand = true;
    private autoActive = true;

    constructor(id, name, icon = null, routerLink: any = null, allowDrag = false, allowDropFrom = false, allowDropTo = false) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.routerLink = routerLink;
        this.allowDrag = allowDrag;
        this.allowDropFrom = allowDropFrom;
        this.allowDropTo = allowDropTo;
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

    static sortNodes(a: SidebarNode, b: SidebarNode) {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    }

    setChildren(children: SidebarNode[]) {
        this.children = children;
    }

    getNamespace(): string {
        return this.id.split('.')[0];
    }

    getEntity(): string {
        return this.id.split('.')[0] + '.' + this.id.split('.')[1];
    }

    getField(): string {
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

    setDropAction(action: (tree: TreeModel, node: TreeNode, $event: any, {from, to}) => any) {
        this.dropAction = action;
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

    setAlgSymbol(symbol: string) {
        this.algSymbol = symbol;
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
