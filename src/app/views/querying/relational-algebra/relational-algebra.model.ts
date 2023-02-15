import {SortState} from '../../../components/data-view/models/sort-state.model';
import {SidebarNode} from '../../../models/sidebar-node.model';

export enum LogicalOperator {
    Scan = 'Scan',
    Join = 'Join',
    Filter = 'Filter',
    Project = 'Project',
    Aggregate = 'Aggregate',
    Minus = 'Minus',
    Sort = 'Sort',
    Union = 'Union',
    Intersect = 'Intersect'

    /*
    Calc,
    Correlate,
    Exchange,
    Match,
    SortExchange,
    TableFunctionScan,
    TableModify,
    Values,
    Window
    */
}

export class LogicalOperatorUtil {
    static operatorToSidbearNode(operator: LogicalOperator): SidebarNode {
        let sidebarNode;
        switch (operator) {
            case LogicalOperator.Scan:
                sidebarNode = new SidebarNode('operator_' + operator, operator, 'fa fa-database', null, true);
                break;
            case LogicalOperator.Join:
                sidebarNode = new SidebarNode('operator_' + operator, operator, null, null, true).setRelAlgSymbol('&#8904;');
                break;
            case LogicalOperator.Filter:
                sidebarNode = new SidebarNode('operator_' + operator, operator, null, null, true).setRelAlgSymbol('&sigma;');
                break;
            case LogicalOperator.Project:
                sidebarNode = new SidebarNode('operator_' + operator, operator, null, null, true).setRelAlgSymbol('&pi;');
                break;
            case LogicalOperator.Aggregate:
                sidebarNode = new SidebarNode('operator_' + operator, operator, 'fa fa-plus-circle', null, true);
                break;
            case LogicalOperator.Sort:
                sidebarNode = new SidebarNode('operator_' + operator, operator, 'fa fa-arrows-v', null, true);
                break;
            case LogicalOperator.Union:
                sidebarNode = new SidebarNode('operator_' + operator, operator, null, null, true).setRelAlgSymbol('&cup;');
                break;
            case LogicalOperator.Minus:
                //sidebarNode = new SidebarNode('operator_' + operator, operator, null, null, true).setRelAlgSymbol('-');
                sidebarNode = new SidebarNode('operator_' + operator, operator, 'fa fa-minus-circle', null, true);
                break;
            case LogicalOperator.Intersect:
                sidebarNode = new SidebarNode('operator_' + operator, operator, null, null, true).setRelAlgSymbol('&cap;');
                break;
            default:
                sidebarNode = new SidebarNode('operator_' + operator, operator, 'fa fa-arrows', null, true);
        }
        return sidebarNode.setAutoActive(false);
    }
}

export interface Connection {
    id: string;
    source: Node;
    target: Node;
}

export class Node {
    children: Node[] = [];
    inputCount = 0;
    dragging: boolean;
    height: number;
    width: number;
    icon: string;
    relAlgSymbol: string;

    //autocomplete
    autocomplete: string[];
    acColumns = new Set<string>();
    acTableColumns = new Set<string>();
    acSchema = new Set<string>();
    acTable = new Set<string>();
    zIndex = 1;

    //parameters:
    //Scan
    tableName: string;
    tableType: String;

    //Join
    join = 'INNER';
    operator = '=';
    col1: string;
    col2: string;

    //filter
    //(operator)
    field: string;
    filter: string;

    //project
    fields: string[] = [''];

    //aggregate
    groupBy: string;
    aggregation = 'SUM';
    alias: string;
    //(field)

    //sort
    sortColumns: SortState[] = [new SortState()];

    //union, minus, intersect
    all = false;

    //additional information needed for Views
    tableTypes: String[];
    initialNames: String[];

    constructor(
        public id: string,
        public type: LogicalOperator,
        public left: number,
        public top: number
    ) {
        this.dragging = false;
    }

    static fromJson(o: any, width: number, height: number) {
        const n = new Node(o.id, o.type, o.left, o.top);
        for (const [key, val] of Object.entries(o)) {
            n[key] = o[key];
        }
        //handle sets
        const sets = ['acColumns', 'acTableColumns', 'acSchema', 'acTable'];
        for (const s of sets) {
            if (o[s].size !== undefined) {
                n[s] = new Set<string>([...o[s]]);
            } else {
                n[s] = new Set<string>();
            }
        }
        //make sure, it is in the working area
        if (n.left > width) {
            n.left = width - 260;
        }
        if (n.top > height) {
            n.top = height - 100;
        }

        return n;
    }

    getId() {
        return this.id;
    }

    getChildren() {
        return this.children;
    }

    setChildren(nodes: Node[]) {
        this.children = nodes;
    }

    setInputCount(inputCount: number) {
        this.inputCount = inputCount;
    }

    clone() {
        const n = new Node(this.id, this.type, this.left, this.top);
        for (const [key, val] of Object.entries(this)) {
            n[key] = val;
        }
        return n;
    }

    setDragging(isDragging: boolean) {
        this.dragging = isDragging;
    }

    isDragging() {
        return this.dragging;
    }

    getWidth() {
        return this.width;
    }

    setWidth(w: number) {
        this.width = w;
    }

    getHeight() {
        return this.height;
    }

    setHeight(h: number) {
        this.height = h;
    }

    setAutocomplete(autocomplete: string[]) {
        this.autocomplete = autocomplete;
    }

    getAcSchema() {
        return this.acSchema;
    }

    setAcSchema(s: Set<string>) {
        this.acSchema = s;
    }

    getAcTable() {
        return this.acTable;
    }

    setAcTable(t: Set<string>) {
        this.acTable = t;
    }

    getAcColumns() {
        return this.acColumns;
    }

    setAcColumns(c: Set<string>) {
        this.acColumns = c;
    }

    getAcTableColumns() {
        return this.acTableColumns;
    }

    setAcTableColumns(tc: Set<string>) {
        this.acTableColumns = tc;
    }

    setIcon(icon: string) {
        this.icon = icon;
        return this;
    }

    setRelAlgSymbol(symbol: string) {
        this.relAlgSymbol = symbol;
        return this;
    }

    setTableType(type: String) {
        this.tableType = type;
    }

    setTypeList(ac: String[]) {
        this.tableTypes = ac;
    }

    allName(ac: String[]) {
        this.initialNames = ac;

    }
}
