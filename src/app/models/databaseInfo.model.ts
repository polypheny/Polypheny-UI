export interface DatabaseInfo {
    name: string;
    schemas: SchemaInfo[];
}

export interface TableInfo {
    name: string;
    attributes: AttributeInfo[];
}

export interface SchemaInfo {
    name: string;
    tables: TableInfo[];
}

export interface AttributeInfo {
    name: String;
    type: String;
    sampleValues?: string[];
    selected?: boolean;
}
