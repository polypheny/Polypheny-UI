import {SortState} from '../../../components/data-table/models/sort-state.model';

export enum LogicalOperator {
  TableScan = 'TableScan',
  Join = 'Join',
  Filter = 'Filter',
  Project = 'Project',
  Aggregate = 'Aggregate',
  Sort = 'Sort',
  Union = 'Union',
  Minus = 'Minus'

  /*
  Calc,
  Correlate,
  Exchange,
  Intersect,
  Match,
  SortExchange,
  TableFunctionScan,
  TableModify,
  Values,
  Window
  */
}

export interface Connection{
  id: string;
  source: Node;
  target: Node;
}

export class Node{
  children: Node[] = [];
  inputCount = 0;
  dragging: boolean;
  height: number;
  width: number;

  //autocomplete
  autocomplete: string[];
  acColumns = new Set<string>();
  acTableColumns = new Set<string>();
  acSchema = new Set<string>();
  acTable = new Set<string>();
  zIndex = 1;

  //parameters:
  //TableScan
  tableName: string;

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
  fields: string;

  //aggregate
  groupBy: string;
  aggregation = 'SUM';
  alias: string;
  //(field)

  //sort
  sortColumns: SortState[] = [new SortState()];

  //union
  all: boolean;

  constructor(
    public id: string,
    public type: LogicalOperator,
    public left: number,
    public top: number
  ){
    this.dragging = false;
  }
  static fromJson( o: any ){
    const n = new Node( o.id, o.type, o.left, o.top );
    for( const [key, val] of Object.entries(o) ){
      n[key] = o[key];
    }
    //handle sets
    const sets = ['acColumns', 'acTableColumns', 'acSchema', 'acTable'];
    for( const s of sets ){
      if( o[s].size !== undefined ){
        n[s] = new Set<string>([...o[s]]);
      } else {
        n[s] = new Set<string>();
      }
    }
    return n;
  }
  getId(){
    return this.id;
  }
  getChildren(){
    return this.children;
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
  getWidth(){
    return this.width;
  }
  setWidth( w: number ){
    this.width = w;
  }
  getHeight(){
    return this.height;
  }
  setHeight( h: number ){
    this.height = h;
  }
  setAutocomplete( autocomplete: string[] ){
    this.autocomplete = autocomplete;
  }
  getAcSchema(){
    return this.acSchema;
  }
  setAcSchema( s: Set<string> ){
    this.acSchema = s;
  }
  getAcTable(){
    return this.acTable;
  }
  setAcTable( t: Set<string> ){
    this.acTable = t;
  }
  getAcColumns(){
    return this.acColumns;
  }
  setAcColumns( c: Set<string> ){
    this.acColumns = c;
  }
  getAcTableColumns () {
    return this.acTableColumns;
  }
  setAcTableColumns ( tc: Set<string> ) {
    this.acTableColumns = tc;
  }
}
