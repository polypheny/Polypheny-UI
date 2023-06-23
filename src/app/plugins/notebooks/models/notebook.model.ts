import {KernelData, KernelDisplayMetadata} from './kernel-response.model';
import {CellType} from '../components/notebooks-view/edit-notebook/notebook-wrapper';

export interface Notebook {
    cells: NotebookCell[];
    metadata: NotebookMetadata;
    nbformat: number;
    nbformat_minor: number;
}

export interface NotebookMetadata {
    kernelspec?: {
        display_name: string;
        language: string;
        name: string;
    };
    language_info?: {
        codemirror_mode: {
            name: string;
            version: number;
        };
        file_extension: string;
        mimetype: string;
        name: string;
        nbconvert_exporter: string;
        pygments_lexer: string;
        version: string;
    };

}

export interface NotebookCell {
    cell_type: 'code' | 'markdown' | 'raw';
    id: string;
    metadata: CellMetadata;
    source: string[] | string;
    execution_count: number;
    outputs?: (CellStreamOutput | CellDisplayDataOutput | CellExecuteResultOutput | CellErrorOutput)[];
}

export interface CellOutput {
    output_type: CellOutputType;
}

export interface CellStreamOutput extends CellOutput {
    name: 'stdout' | 'stderr';
    text: string[] | string;
}

export interface CellDisplayDataOutput extends CellOutput {
    data: KernelData;
    metadata: KernelDisplayMetadata;
    transient?: {
        display_id: string
    };
}

export interface CellExecuteResultOutput extends CellOutput {
    execution_count: number;
    data: KernelData;
    metadata: KernelDisplayMetadata;
    transient?: { [key: string]: string };

}

export interface CellErrorOutput extends CellOutput {
    ename: string;
    evalue: string;
    traceback: string[];
}

// https://nbformat.readthedocs.io/en/latest/format_description.html#cell-metadata
export interface CellMetadata {
    collapsed?: boolean;
    scrolled?: boolean | 'auto';
    deletable?: boolean;
    editable?: boolean;
    format?: string; // for raw cells
    name?: string;
    tags?: string[] | string;
    jupyter?: {
        source_hidden?: boolean;
        outputs_hidden?: boolean;
    };
    execution?: {};
    polypheny?: PolyphenyMetadata;

}

export interface PolyphenyMetadata {
    cell_type?: CellType;
    namespace?: string;
    language?: string;
    result_variable?: string;
    manual_execution?: boolean;
    expand_params?: boolean;
}

export type CellOutputType = 'execute_result' | 'stream' | 'display_data' | 'error';
