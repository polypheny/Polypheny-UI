import {Notebook} from './notebook.model';

export interface SessionResponse {
    id: string;
    path: string;
    name: string;
    type: string;
    kernel: KernelResponse;
    notebook: {
        path: string;
        name: string;
    };
}

export interface KernelResponse {
    id: string;
    name: string;
    last_activity: string;
    execution_state: string;
    connections: number;
}

export interface KernelSpecs {
    default: string;
    kernelspecs: { [key: string]: KernelSpec };
}

export interface KernelSpec {
    name: string;
    spec: {
        argv: string[];
        env: {};
        display_name: string;
        language: string;
        interrupt_mode: string;
        metadata: {
            debugger: boolean;
        }
    };
    resources: {
        'logo-32x32': string;
        'logo-64x64': string;
        'logo-svg': string;
    };
}

export interface Content {
    name: string;
    path: string;
    last_modified: string;
    created: string;
    format: string;
    mimetype: string;
    size: number;
    writable: boolean;
    type: string;
}

export interface DirectoryContent extends Content {
    content: Content[];
}

export interface FileContent extends Content {
    content: string | Notebook;
}

export interface NotebookContent extends Content {
    content: Notebook;
}

export interface StatusResponse {
    connections: number;
    kernels: number;
    last_activity: string;
    started: string;
}
