/**
 * AbstractNode interface with general implementation.
 */

export class Node implements AbstractNode {
    type: string;
    name: string;
    children: AbstractNode[] = [];
    properties: { [key: string]: any } = {};
    isSelected?: boolean;

    jsonPath?: string;
    cardCandidate?: boolean;
    valueType?: string;


    constructor(type: string, name: string) {
        this.type = type;
        this.name = name;
    }

    addChild(node: AbstractNode): void {
        this.children.push(node);
    }

    addProperty(key: string, value: any): void {
        this.properties[key] = value;
    }

    getProperty(key: string): string {
        return this.properties[key];
    }
}


export interface ColumnToggleEvent {
    fullKey: string;
    checked: boolean;
    diff?: 'ADDED' | 'REMOVED';
    type?: 'ghost' | 'table' | 'column';
}

export interface AbstractNode {
    type: string;
    name: string;
    children?: AbstractNode[];
    properties?: { [key: string]: any };
    isSelected?: boolean;
    jsonPath?: string;
    cardCandidate?: boolean;
    valueType?: string;

    addChild(node: AbstractNode): void;

    addProperty(key: string, value: any): void;

    getProperty(key: string): string | null;
}

/**
 * model for handling preview data
 */
export class PreviewResult {
    metadata: string;
    preview: any[];
    history?: ChangeLogView[];
}

export interface ChangeLogView {
    adapterName: string;
    timestamp: string;
    severity: ChangeStatus;
    messages: string[];
}

export enum ChangeStatus {
    CRITICAL = 'CRITICAL',
    WARNING = 'WARNING',
    OK = 'OK'
}
