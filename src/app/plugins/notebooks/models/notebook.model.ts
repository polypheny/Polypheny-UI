export interface Notebook {
    cells: NotebookCell[];
    metadata: NotebookMetadata;
    nbformat: number;
    nbformat_minor: number;
}

export interface NotebookMetadata {
    kernelspec: {
        display_name: string;
        language: string;
        name: string;
    };
    language_info: {
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
    cell_type: string;
    id: string;
    metadata: {};
    source: string[];
    execution_count: number;
    outputs?: CellOutput[];
}

export interface CellOutput {
    name: string;
    output_type: string;
    text?: string[];
    data?: {
        'text/plain': Array<string>
        'text/html'?: Array<string>
        'image/png'?: string
    };
}
