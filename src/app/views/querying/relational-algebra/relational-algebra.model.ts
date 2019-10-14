import {SortState} from '../../../components/data-table/models/sort-state.model';

export enum LogicalOperator {
  TableScan,
  Join,
  Filter,
  Project,
  Aggregate,
  Sort

  /*
  Calc,
  Correlate,
  Exchange,
  Intersect,
  Match,
  Minus,
  SortExchange,
  TableFunctionScan,
  TableModify,
  Union,
  Values,
  Window
  */
}

export interface Connection{
  source: Node;
  target: Node;
}

export class Node{
  children: Node[] = [];
  inputCount = 0;
  dragging;
  height: number;

  //parameters:
  //TableScan
  tableName;
  //Join
  join = 'INNER';
  operator = '=';
  col1;
  col2;
  //filter
  //(operator)
  field;
  filter;
  //project
  fields;
  //aggregate
  groupBy;
  aggregation = 'SUM';
  alias;
  //(field)
  //sort
  sortColumns: SortState[] = [new SortState()];

  constructor(
    public id: string,
    public type: LogicalOperator,
    public left: number,
    public top: number
  ){
    this.dragging = false;
  }
  getId(){
    return this.id;
  }
  setChildren(nodes: Node[] ){
    this.children = nodes;
  }
  setInputCount( inputCount: number ){
    this.inputCount = inputCount;
  }
  clone(){
    const n = new Node( this.id, this.type, this.left, this.top );
    for( const [key, val] of Object.entries(this) ){
      n[key] = val;
    }
    return n;
  }
  setDragging( isDragging: boolean ){
    this.dragging = isDragging;
  }
  isDragging(){
    return this.dragging;
  }
}
