import {DataModel} from '../../../models/ui-request.model';

export type MappingKind = 'PHYSICAL_TO_LOGICAL' | 'LOGICAL_TO_LOGICAL' | 'LOGICAL_TO_EXPOSED';

export interface MappingSummary {
    mappingId: number;
    adapterId: number;
    adapterName: string;
    mappingName: string;
    kind: MappingKind;
    sourceEntityId?: number;
    targetEntityId: number;
    sourceModel: DataModel;
    targetModel: DataModel;
    namespaceName: string;
    logicalTableName: string;
    editable: boolean;
    readOnlyReason?: string;
}

export interface PhysicalSourceReference {
    allocationId: number;
    physicalEntityId: number;
    namespaceName: string;
    physicalName: string;
}

export interface MappingColumn {
    logicalColumnId: number;
    logicalName: string;
    logicalPosition: number;
    typeDisplay: string;
    nullable: boolean;
    included?: boolean;
    physicalReferences: {
        allocationId: number;
        physicalEntityId: number;
        physicalColumnId: number;
        physicalName: string;
        physicalPosition: number;
        typeDisplay: string;
        nullable: boolean;
    }[];
}

export interface MappingRule {
    type: string;
    targetLogicalColumnId?: number;
}

export interface MappingValidation {
    mappingNameMaxLength: number;
    identifierMaxLength: number;
    identifierPattern: string;
    mappingNameMessage: string;
    identifierMessage: string;
}

export interface MappingDetail extends MappingSummary {
    revision: string;
    namespaceId: number;
    namespaceCaseSensitive: boolean;
    columns: MappingColumn[];
    physicalSources: PhysicalSourceReference[];
    rules: MappingRule[];
    validation: MappingValidation;
    availableRules?: {type: string; label: string}[];
}

export interface AdapterMappings {
    adapterId: number;
    adapterName: string;
    mappings: MappingSummary[];
}

export interface MappingDraft {
    mappingName: string;
    logicalTableName: string;
    columns: { logicalColumnId: number; logicalName: string; included?: boolean }[];
}

export interface MappingUpdate extends MappingDraft {
    adapterId: number;
    mappingId: number;
    expectedRevision: string;
}

export interface MappingError {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    blockingEntities?: string[];
}
