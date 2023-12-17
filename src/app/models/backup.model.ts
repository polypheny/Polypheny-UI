import {DataModel} from "./ui-request.model";
import {Pair} from "../components/json/json-editor.component";

export class ManifestModel {
    id: number;
    timestamp: string;
    elements: ElementModel[];
    tooltip: string;


    constructor(id: number, timestamp: string, elements: ElementModel[]) {
        this.id = id;
        this.timestamp = timestamp;
        this.elements = elements;
        this.tooltip = this.elements.map(e => e.getDescription()).reduce((a, b) => a + '\n' + b)
    }
}

export class ElementModel {
    initialName: string;
    adjustedName: string;
    type: string;
    model: DataModel;
    children: ElementModel[];
    dependencies: Pair[];
    backupType: string;
    additionalInformation: string;

    getDescription(): string {
        return this.initialName + ', ' + this.type + ', ' + this.model + ', {' + this.children.map(e => e.getDescription()) + '}, ' + this.additionalInformation;
    }
}

export interface StatusModel {
    code: Code,
    message: string
}

export enum Code {
    SUCCESS = 'SUCCESS',
    RUNNING = 'RUNNING',
    ERROR = 'ERROR'
}
