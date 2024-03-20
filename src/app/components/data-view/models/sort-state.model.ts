/**
 * models if and how a column is supposed to be sorted
 */
export class SortState {
    direction: SortDirection = SortDirection.DESC;
    sorting = false;
    //for the PlanBuilder
    column: string;

    constructor() {
        this.column = '';
    }
}

/**
 * direction of the sorting of a column in a ResultSet
 */
export enum SortDirection {

    /**
     * ascending
     */
    ASC = 'ASC',

    /**
     * descending
     */
    DESC = 'DESC'
}

export class InputValidation {
    cssClass;

    constructor(
        public valid: boolean,
        public message: string = null,
    ) {
        if (valid) {
            this.cssClass = 'is-valid';
        } else {
            this.cssClass = 'is-invalid';
        }
    }
}
