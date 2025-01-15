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

export enum ExecutionState {
    SUBMITTED = 'SUBMITTED',
    EXECUTING = 'EXECUTING',
    AWAIT_PROCESSING = 'AWAIT_PROCESSING',
    PROCESSING_RESULT = 'PROCESSING_RESULT',
    DONE = 'DONE'
}

export enum ExecutorType {
    DEFAULT = 'DEFAULT',
    FUSION = 'FUSION',
    PIPE = 'PIPE',
    VARIABLE_WRITER = 'VARIABLE_WRITER'
}

export type SettingsModel = Record<string, any>;
export type Variables = Record<string, any>;

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
    timeoutSeconds: number; // 0 for no timeout
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
    settings: SettingsModel;
    config: ActivityConfigModel;
    rendering: RenderModel;
    state?: ActivityState;
    inTypePreview?: TypePreviewModel[];
    invalidReason?: string;
    variables?: Variables;
    executionInfo?: ExecutionInfoModel;
}

export interface ExecutionInfoModel {
    totalDuration: number;
    durations: Record<ExecutionState, number>;
    activities: string[];
    executorType: ExecutorType;
    state: ExecutionState;
}

export interface SessionModel {
    type: SessionModelType;
    sessionId: string;
    connectionCount: number;

    // Only for USER_SESSION
    workflowId?: string;
    version?: number;
    workflowDef?: WorkflowDefModel;
    state?: WorkflowState;
}

export interface WorkflowDefModel {
    name: string;
    versions: Record<number, VersionInfo>;
    group: string;
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
    variables: SettingsModel;
    state?: WorkflowState;
}

export interface WorkflowConfigModel {
    preferredStores: Record<DataModel, string>;
    fusionEnabled: boolean;
    pipelineEnabled: boolean;
    timeoutSeconds: number; // 0 for no timeout
    dropUnusedCheckpoints: boolean;
    maxWorkers: number;
    pipelineQueueCapacity: number;
}
