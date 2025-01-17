import {ActivityModel, ActivityState, EdgeModel, RenderModel, WorkflowState} from './workflows.model';
import {Result} from '../../../components/data-view/models/result-set.model';

export enum ResponseType {
    ACTIVITY_UPDATE = 'ACTIVITY_UPDATE',
    RENDERING_UPDATE = 'RENDERING_UPDATE',
    STATE_UPDATE = 'STATE_UPDATE',
    PROGRESS_UPDATE = 'PROGRESS_UPDATE',
    CHECKPOINT_DATA = 'CHECKPOINT_DATA',
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
    GET_CHECKPOINT = 'GET_CHECKPOINT'
}

export interface WsResponse {
    type: ResponseType;
    msgId: string;
    parentId?: string;
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
    activityInvalidReasons: Record<string, string>;
    activityInvalidSettings: Record<string, Record<string, string>>;
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

export interface CheckpointDataResponse extends WsResponse {
    type: ResponseType.CHECKPOINT_DATA;
    result: Result<any, any>;
    limit: number;
    totalCount: number;
}
