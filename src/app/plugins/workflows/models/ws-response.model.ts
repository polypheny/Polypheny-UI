import {ActivityModel, ActivityState, EdgeModel, RenderModel, WorkflowModel, WorkflowState} from './workflows.model';

export enum ResponseType {
    WORKFLOW_UPDATE = 'WORKFLOW_UPDATE',
    ACTIVITY_UPDATE = 'ACTIVITY_UPDATE',
    RENDERING_UPDATE = 'RENDERING_UPDATE',
    STATE_UPDATE = 'STATE_UPDATE',
    PROGRESS_UPDATE = 'PROGRESS_UPDATE',
    ERROR = 'ERROR'
}

export enum RequestType { // no specific interfaces for requests are required, since they are sent by the frontend
    CREATE_ACTIVITY = 'CREATE_ACTIVITY',
    DELETE_ACTIVITY = 'DELETE_ACTIVITY',
    UPDATE_ACTIVITY = 'UPDATE_ACTIVITY',
    CLONE_ACTIVITY = 'CLONE_ACTIVITY',
    CREATE_EDGE = 'CREATE_EDGE',
    DELETE_EDGE = 'DELETE_EDGE',
    EXECUTE = 'EXECUTE',
    INTERRUPT = 'INTERRUPT',
    RESET = 'RESET',
    UPDATE_CONFIG = 'UPDATE_CONFIG',
    UPDATE_VARIABLES = 'UPDATE_VARIABLES',
}

export interface WsResponse {
    type: ResponseType;
    msgId: string;
    parentId?: string;
}

export interface WorkflowUpdateResponse extends WsResponse {
    type: ResponseType.WORKFLOW_UPDATE;
    workflow: WorkflowModel;
}

export interface ActivityUpdateResponse extends WsResponse {
    type: ResponseType.ACTIVITY_UPDATE;
    activity: ActivityModel;
}

export interface RenderingUpdateResponse extends WsResponse {
    type: ResponseType.RENDERING_UPDATE;
    activityId: string;
    rendering: RenderModel;
}

export interface StateUpdateResponse extends WsResponse {
    type: ResponseType.STATE_UPDATE;
    workflowState: WorkflowState;
    activityStates: Record<string, ActivityState>;
    edgeStates: EdgeModel[];
}

export interface ProgressUpdateResponse extends WsResponse {
    type: ResponseType.PROGRESS_UPDATE;
    progress: Record<string, number>;
}

export interface ErrorResponse extends WsResponse {
    type: ResponseType.ERROR;
    reason: string;
    cause?: string;
    parentType: RequestType;
}
