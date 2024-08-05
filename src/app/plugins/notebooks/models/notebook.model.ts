import {KernelData, KernelDisplayMetadata} from './kernel-response.model';
import {CellType} from '../components/edit-notebook/notebook-wrapper';

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
    polypheny?: PolyphenyNbMetadata;
    persentation?:{
        backgroundColor:string,
        textColor:string
    }

}

export interface NotebookCell {
    cell_type: 'code' | 'markdown' | 'raw';
    cell_present: 'slide' | 'subSlide' | 'notes' | 'skip' | 'fragment';
    id: string;
    metadata: CellMetadata;
    source: string[] | string;
    execution_count: number;
    showOutput?:boolean;
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
}

export interface CellExecuteResultOutput extends CellOutput {
    execution_count: number;
    data: KernelData;
    metadata: KernelDisplayMetadata;

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

// Cell-level metadata
export interface PolyphenyMetadata {
    cell_type?: CellType;
    namespace?: string;
    language?: string;
    result_variable?: string;
    manual_execution?: boolean;
    expand_params?: boolean; // default: true (only active if nb-lvl expand_params is true as well)
}

// Notebook-level metadata
export interface PolyphenyNbMetadata {
    expand_params?: boolean; // used to toggle expansion for entire notebook, default: false
}

export type CellOutputType = 'execute_result' | 'stream' | 'display_data' | 'error';
