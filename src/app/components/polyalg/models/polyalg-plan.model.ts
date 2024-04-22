
export interface PlanNode {
    opName: string;
    arguments: {
        [key: string]: PlanArgument
    };
    inputs: PlanNode[];
    defaultValue: string;
}

interface PlanArgument {
    type: string;
    value: any;
}

