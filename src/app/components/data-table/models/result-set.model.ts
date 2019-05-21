import {SortState} from './sort-state.model';

/**
 * model for the result of a query coming from the server
 */
export interface ResultSet{
    header: DbColumn[];
    data: string[][];
    currentPage: number;
    highestPage: number;
    table: string;
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
