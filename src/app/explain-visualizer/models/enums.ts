export class HighlightType {
    static NONE = 'none';
    static CPU = 'cpu cost';
    static ROWS = 'row cost';
    static COST = 'io cost';
}

export enum EstimateDirection {
    over,
    under,
    equal
}

export class ViewMode {
    static FULL = 'full';
    static COMPACT = 'compact';
    static DOT = 'dot';
}
