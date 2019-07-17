export class RelationalAlgebra {
  private static id = 0;
  id: number;
  parent: RelationalAlgebra;
  relOp: LogicalOperators;
  children: Map<number, RelationalAlgebra> = new Map<number, RelationalAlgebra>();

  static nextId() {
    return this.id++;
  }

  static resetId() {
    this.id = 0;
  }

  constructor ( method: LogicalOperators, parent: RelationalAlgebra ) {
    this.id = RelationalAlgebra.nextId();
    this.relOp = method;
    this.parent = parent;
  }

  addChild( child: RelationalAlgebra ){
    this.children.set( child.id, child );
  }

  removeChild ( child: RelationalAlgebra ) {
    this.children.delete( child.id );
  }

  /**
   * Convert object, so it can be used by the _crud service.
   * The map needs to be converted to an object, so that it will be correctly transformed into a json string.
   */
  forCrud () {
    const kids = {};
    this.children.forEach((v, k) => {
      kids[k] = v.forCrud();
    });
    // without parent
    return { id: this.id, method: LogicalOperators[this.relOp], children: kids };
  }

}

export enum LogicalOperators {
  LogicalAggregate,
  LogicalCalc,
  LogicalCorrelate,
  LogicalExchange,
  LogicalFilter,
  LogicalIntersect,
  LogicalJoin,
  LogicalMatch,
  LogicalMinus,
  LogicalProject,
  LogicalSort,
  LogicalSortExchange,
  LogicalTableModify,
  LogicalTableScan,
  LogicalUnion,
  LogicalValues,
  LogicalWindow
}
