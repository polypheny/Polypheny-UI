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
 * model for the column of a ResultSet
 */
export interface DbColumn {
    name: string;
    sort: SortState;
    dataType: number;
    filter: string;
}

/**
 * model for infos about the query, e.g. number of affected rows
 */
export interface Debug {
    affectedRows: number;
    generatedQuery: string;
}
