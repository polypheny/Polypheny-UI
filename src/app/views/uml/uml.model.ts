import {DbColumn} from '../../components/data-view/models/result-set.model';
import {EntityType} from '../../models/catalog.model';

export class Uml {
    constructor(
        public tables: Map<string, DbTable>,
        public foreignKeys: ForeignKey[]
    ) {
    }
}

export class DbTable {
    tableName: string;
    schema: string;
    columns: DbColumn[];
    primaryKeyFields: string[];
    uniqueColumns: string[];
    modifiable: boolean;
    tableType: EntityType;
}

export class ForeignKey {
    fkName: string;
    id: number;

    targetSchema: string;
    targetTable: string;
    targetColumn: string;

    sourceSchema: string;
    sourceTable: string;
    sourceColumn: string;

    onUpdate: string;
    onDelete: string;

    constructor(id: number, fkName: string, schema: string, fkTable: string, fkCol: string, pkTable: string, pkCol: string) {
        this.id = id;
        this.fkName = fkName;
        this.targetSchema = schema;
        this.sourceSchema = schema;
        this.sourceTable = fkTable;
        this.sourceColumn = fkCol;
        this.targetTable = pkTable;
        this.targetColumn = pkCol;
    }

    updateAction(action: string) {
        this.onUpdate = action;
        return this;
    }

    deleteAction(action: string) {
        this.onDelete = action;
        return this;
    }

}

export interface SvgLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
