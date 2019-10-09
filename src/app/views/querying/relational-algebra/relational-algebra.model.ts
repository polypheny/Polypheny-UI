export enum LogicalOperators {
  TableScan,
  Join,
  Filter,
  Project

  /*
  Aggregate,
  Calc,
  Correlate,
  Exchange,
  Intersect,
  Match,
  Minus,
  Sort,
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
  constructor(
    public id: string,
    public type: string,
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
    return new Node( this.id, this.type, this.left, this.top );
  }
  setDragging( isDragging: boolean ){
    this.dragging = isDragging;
  }
  isDragging(){
    return this.dragging;
  }
}
