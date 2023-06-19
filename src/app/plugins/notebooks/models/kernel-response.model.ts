
// Based on the Jupyter message specification v5.4
// https://jupyter-client.readthedocs.io/en/stable/messaging.html
import {CellDisplayDataOutput, CellErrorOutput, CellExecuteResultOutput} from './notebook.model';

export interface KernelMsg {
    header: MsgHeader;
    msg_id: string;
    msg_type: string;
    parent_header: MsgParentHeader;
    metadata: {};
    buffers: any[];
    channel: string;
}

export interface MsgHeader {
    msg_id: string;
    msg_type: string;
    username: string;
    session: string;
    date: string;
    version: string;
}

export interface MsgParentHeader {
    msg_id: string;
    msg_type: string;
    version: string;
    date: string;
}

export interface KernelStatus extends KernelMsg {
    content: {
        execution_state: 'busy' | 'idle' | 'starting'
    };
}

export interface KernelExecuteInput extends KernelMsg {
    content: {
        code: string,
        execution_count: number
    };
}

/**
 * Sent when a execute_request has finished to inform about the status of the execution.
 *
 */
export interface KernelExecuteReply extends KernelMsg {
    content: {
        status: 'ok' | 'error' | 'aborted',
        execution_count: number,
        user_expressions: {},
        payload: any[]

    };
}

export interface KernelStream extends KernelMsg {
    content: {
        name: 'stdout' | 'stderr',
        text: string  // corresponding CellStreamOutput.text can also be string[], but not here
    };
}

/**
 * Identical to KernelDisplayData, except for the execution_count.
 * A plain text representation should always be provided in the text/plain mime-type.
 * Frontends should ignore mime-types they do not understand.
 */
export interface KernelExecuteResult extends KernelMsg {
    content: Omit<CellExecuteResultOutput, 'output_type'>;
}

export interface KernelErrorMsg extends KernelMsg {
    content: Omit<CellErrorOutput, 'output_type'>;
}

export interface KernelInterruptReply extends KernelMsg {
    content: {
        status: 'ok' | 'error' | 'aborted'
    };
}

export interface KernelShutdownReply extends KernelMsg {
    content: {
        status: 'ok' | 'error' | 'aborted',
        restart: boolean
    };
}

export interface KernelDisplayData extends KernelMsg {
    content: Omit<CellDisplayDataOutput, 'output_type'>;
}

export interface KernelUpdateDisplayData extends KernelMsg {
    content: Omit<CellDisplayDataOutput, 'output_type'>;
}

export interface KernelData {
    'text/plain'?: string[] | string;
    'text/html'?: string[] | string;
    'image/png'?: string[] | string;
    'application/json'?: {};
}

export interface KernelDisplayMetadata {
    'image/png'?: {
        width: number,
        height: number
    };
    'application/json'?: {
        'expanded': boolean
    };
    polypheny?: {
        result_variable: string;
    };
}
