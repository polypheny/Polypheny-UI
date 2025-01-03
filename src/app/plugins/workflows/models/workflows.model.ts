import {DataModel} from '../../../models/ui-request.model';
import {FieldDefinition} from '../../../components/data-view/models/result-set.model';

export enum EdgeState {
    IDLE = 'IDLE',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

export enum CommonType {
    NONE = 'NONE',
    EXTRACT = 'EXTRACT',
    LOAD = 'LOAD'
}

export enum ControlStateMerger {
    AND_OR = 'AND_OR',
    AND_AND = 'AND_AND'
}

export enum ActivityState {
    IDLE = 'IDLE',
    QUEUED = 'QUEUED',
    EXECUTING = 'EXECUTING',
    SKIPPED = 'SKIPPED',
    FAILED = 'FAILED',
    FINISHED = 'FINISHED',
    SAVED = 'SAVED'
}

export enum WorkflowState {
    IDLE = 'IDLE',
    EXECUTING = 'EXECUTING',
    INTERRUPTED = 'INTERRUPTED'
}

export enum SessionModelType {
    USER_SESSION = 'USER_SESSION',
    API_SESSION = 'API_SESSION',
    JOB_SESSION = 'JOB_SESSION'
}

export type Settings = Record<string, any>;

export interface EdgeModel {
    fromId: string;
    toId: string;
    fromPort: number;
    toPort: number;
    isControl: boolean;
    state?: EdgeState; // only non-null when receiving, not when referencing an edge from the frontend
}

export interface ActivityConfigModel {
    enforceCheckpoint: boolean;
    preferredStores: string[];
    commonType: CommonType;
    controlStateMerger: ControlStateMerger;
}

export interface RenderModel {
    posX: number;
    posY: number;
    name: string;
    notes: string;
}

export interface TypePreviewModel {
    dataModel: DataModel;
    fields: FieldDefinition[];
}

export interface ActivityModel {
    type: string;
    id: string;
    settings: Settings;
    config: ActivityConfigModel;
    rendering: RenderModel;
    state?: ActivityState;
    inTypePreview?: TypePreviewModel[];
    invalidReason?: string;
}

export interface SessionModel {
    type: SessionModelType;
    sessionId: string;
    connectionCount: number;

    // Only for USER_SESSION
    workflowId?: string;
    version?: number;
    workflowDef?: WorkflowDefModel;
}

export interface WorkflowDefModel {
    name: string;
    versions: Record<number, VersionInfo>;
}

export interface VersionInfo {
    description: string;
    creationTime: Date;
}

export interface WorkflowModel {
    format_version: string;
    activities: ActivityModel[];
    edges: EdgeModel[];
    config: WorkflowConfigModel;
    variables: Settings;
    state?: WorkflowState;
}

export interface WorkflowConfigModel {
    preferredStores: Record<DataModel, string>;
    fusionEnabled: boolean;
    pipelineEnabled: boolean;
    maxWorkers: number;
    pipelineQueueCapacity: number;
}
