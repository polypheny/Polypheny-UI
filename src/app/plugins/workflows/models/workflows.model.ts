import {DataModel} from '../../../models/ui-request.model';
import {FieldDefinition} from '../../../components/data-view/models/result-set.model';
import {PortType} from './activity-registry.model';

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
export const errorKey = '$errorMsg';
export const wfVarsKey = '$workflow';
export const envVarsKey = '$env';
export const PK_COL = 'key'; // primary key column of relational checkpoints

export interface ErrorVariable {
    message: string;
    cause?: string;
    origin: string;
}

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
    portType: PortType; // this can be more specific than the port type of the def
    columns?: FieldDefinition[] | null;
    fields?: string[] | null; // for documents
    nodeLabels?: string[] | null; // for graphs
    edgeLabels?: string[] | null; // for graphs
    notConnected: boolean; // only relevant for input previews
}


export interface ActivityModel {
    type: string;
    id: string;
    settings: SettingsModel;
    config: ActivityConfigModel;
    rendering: RenderModel;
    state?: ActivityState;
    rolledBack?: boolean;
    inTypePreview?: TypePreviewModel[];
    outTypePreview?: TypePreviewModel[];
    invalidReason?: string;
    invalidSettings?: Record<string, string>;
    variables?: Variables;
    executionInfo?: ExecutionInfoModel;
}

export interface ExecutionInfoModel {
    submissionTime: string; // ISO 8601
    totalDuration: number;
    durations: Record<ExecutionState, number>;
    activities: string[];
    root: string;
    executorType: ExecutorType;
    state: ExecutionState;
    isSuccess: boolean; // only valid when state == DONE
    tuplesWritten: number; // -1 if not written at all (failed or not yet finished or no data output)
    log?: string[]; // activityId|level|time|message          only available when part of ActivityModel
}

export interface ExecutionMonitorModel {
    startTime: string; // ISO 8601
    totalDuration: number;
    targetActivity: string;
    infos: ExecutionInfoModel[]; // no logs
    totalCount: number;
    successCount: number;
    failCount: number;
    skipCount: number;
    countByExecutorType: Record<ExecutorType, number>;
}

export interface SessionModel {
    type: SessionModelType;
    sessionId: string;
    connectionCount: number;
    lastInteraction: string; // ISO-8601
    activityCount: number;

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
    logCapacity: number;
}
