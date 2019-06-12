import {SortState} from './sort-state.model';

/**
 * model for the result of a query coming from the server
 */
export class ResultSet{
    header: DbColumn[];
    data: string[][];
    currentPage: number;
    highestPage: number;
    table: string;
    tables: string[];
    error: string;
    info: Debug;
    type: string;//"table" or "view"

    constructor ( error: string ){
        this.error = error;
    }
}

/**
 * Model for a column of a table
 */
export class DbColumn {
    //for both
    name: string;

    //for the data-table
    sort: SortState;
    dataType: number;
    filter: string;

    //for editing columns
    primary: boolean;
    nullable: boolean;
    type: string;//varchar/int/etc
    maxLength: string;
    defaultValue: any;

    constructor( name:string, primary: boolean, nullable:boolean, type:string, maxLength:string, defaultValue:string = null ) {
        this.name = name;
        this.primary = primary;
        this.nullable = nullable;
        this.type = type;
        this.maxLength = maxLength;
        this.defaultValue = defaultValue;
    }

    static fromJson( obj ){
        return new DbColumn( obj.name, obj.primary, obj.nullable, obj.type, obj.maxLength, obj.defaultValue);
    }
}

/**
 * model for infos about the query, e.g. number of affected rows
 */
export interface Debug {
    affectedRows: number;
    generatedQuery: string;
}
