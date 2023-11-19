import {SortState} from '../../../components/data-view/models/sort-state.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {signal, WritableSignal} from "@angular/core";

export enum LogicalOperator {
    Scan = 'RelScan',
    Join = 'Join',
    Filter = 'RelFilter',
    Project = 'RelProject',
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
    static operatorToSidebarNode(operator: LogicalOperator): SidebarNode {
        let sidebarNode: SidebarNode;
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

export type AlgNodeModel = {
    name: string;
    inputs: number;
    icon: string;
    symbol: string;
    type: AlgType;
}

export enum AlgType {
    Join = 'Join',
    Filter = 'Filter',
    Project = 'Project',
    Scan = 'Scan',
    Aggregate = 'Aggregate',
    Union = 'Union',
    Sort = 'Sort',
    Minus = 'Minus',
    Modify = 'Modify',
    ModifyCollect = 'ModifyCollect',
    Intersect = 'Intersect',
}

export class Node {
    children: Node[] = [];
    inputCount = 0;
    dragging: boolean;
    height: number;
    width: number;
    icon: string;
    relAlgSymbol: string;
    class: string;

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
    public $left: WritableSignal<number>;
    public $top: WritableSignal<number>;

    constructor(
        public id: string,
        public type: AlgType,
        left: number,
        top: number
    ) {
        this.$left = signal(left);
        this.$top = signal(top);
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
        if (n.$left() > width) {
            n.$left.set(width - 260);
        }
        if (n.$top() > height) {
            n.$top.set(height - 100);
        }

        return n;
    }

    clone() {
        const n = new Node(this.id, this.type, this.$left(), this.$top());
        for (const [key, val] of Object.entries(this)) {
            n[key] = val;
        }
        return n;
    }

}
