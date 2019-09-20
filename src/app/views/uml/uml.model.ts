import {DbColumn} from '../../components/data-table/models/result-set.model';

export class Uml {
  constructor(
    public tables: DbTable[],
    public foreignKeys: ForeignKey[]
  ){}
}

export class DbTable {
  tableName: string;
  schema: string;
  columns: DbColumn[];
  primaryKeyFields: string[];
  uniqueColumns: string[];
}

export class ForeignKey{
  fkName: string;
  pkName: string;

  pkTableSchema: string;
  pkTableName: string;
  pkColumnName: string;

  fkTableSchema: string;
  fkTableName: string;
  fkColumnName: string;

  update: string;
  delete: string;

  constructor( fkName:string, schema:string, fkTable:string, fkCol:string, pkTable:string, pkCol:string){
    this.fkName = fkName;
    this.pkTableSchema = schema;
    this.fkTableSchema = schema;
    this.fkTableName = fkTable;
    this.fkColumnName = fkCol;
    this.pkTableName = pkTable;
    this.pkColumnName = pkCol;
  }

  onUpdate( action: string ){
    this.update = action;
    return this;
  }

  onDelete( action: string ){
    this.delete = action;
    return this;
  }

}

export interface SvgLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
