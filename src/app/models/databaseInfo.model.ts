export interface DatabaseInfo {
    name: string;
    schemas: SchemaInfo[];
}

export interface TableInfo {
    name: string;
    attributes: AttributeInfo[];
    selected?: boolean;
}

export interface SchemaInfo {
    name: string;
    tables: TableInfo[];
}

export interface AttributeInfo {
    name: String;
    type: String;
}
