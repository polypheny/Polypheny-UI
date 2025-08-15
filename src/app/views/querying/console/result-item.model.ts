import {Result} from '../../../components/data-view/models/result-set.model';

export type ItemType = 'data' | 'info';

export abstract class ResultItem {
    abstract readonly itemType: ItemType;
}

export class DataResultItem extends ResultItem {
    readonly itemType = 'data' as const;

    constructor(
        readonly data: Result<any, any>,
        readonly queryIndex: number) {
        super();
    }
}

export class InfoResultItem extends ResultItem {
    readonly itemType = 'info' as const;

    constructor(
        readonly msg: string,
        readonly level: 'success' | 'warning' | 'danger') {
        super();
    }
}
