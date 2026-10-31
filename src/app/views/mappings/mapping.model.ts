import {DataModel} from '../../models/ui-request.model';

export const MAPPING_KINDS = ['PHYSICAL_TO_LOGICAL', 'LOGICAL_TO_LOGICAL', 'LOGICAL_TO_EXPOSED'] as const;
export type MappingKind = typeof MAPPING_KINDS[number];

const MAPPING_KIND_LABELS: Record<MappingKind, string> = {
    PHYSICAL_TO_LOGICAL: 'Physical to Logical',
    LOGICAL_TO_LOGICAL: 'Logical to Logical',
    LOGICAL_TO_EXPOSED: 'Logical to Exposed'
};

export function mappingKindLabel(kind: MappingKind): string {
    return MAPPING_KIND_LABELS[kind] || kind || 'Unavailable';
}

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
    removable: boolean;
    removesTarget: boolean;
    removalBlockedReason?: string;
    readOnlyReason?: string;
    physicalSources?: PhysicalSourceReference[];
    revision?: string;
}

export interface PhysicalSourceReference {
    allocationId: number;
    physicalEntityId: number;
    namespaceName: string;
    physicalName: string;
}

export interface PhysicalSourceSelection {
    adapterId: number;
    namespaceName: string;
    physicalName: string;
}

export function readPhysicalSource(adapterId: string, namespaceName: string, physicalName: string): PhysicalSourceSelection {
    if (adapterId == null || !/^\d+$/.test(adapterId) || !Number.isSafeInteger(Number(adapterId))
        || namespaceName == null || !physicalName?.trim()) {
        return null;
    }
    return {adapterId: Number(adapterId), namespaceName, physicalName};
}

export function mappingUsesSource(mapping: MappingSummary, source: PhysicalSourceSelection): boolean {
    return mapping.kind === 'PHYSICAL_TO_LOGICAL' && mapping.adapterId === source.adapterId
        && !!mapping.physicalSources?.some(physical => physical.namespaceName === source.namespaceName && physical.physicalName === source.physicalName);
}

export interface MappingColumn {
    logicalColumnId: number;
    logicalName: string;
    logicalPosition: number;
    typeDisplay: string;
    nullable: boolean;
    included: boolean;
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
    fixedTargetEntityId?: number;
    targetColumns?: MappingColumn[];
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
    targetNamespaceId?: number;
    logicalTableName: string;
    columns: { logicalColumnId: number; logicalName: string; included: boolean }[];
}

export interface MappingUpdate extends MappingDraft {
    adapterId: number;
    mappingId: number;
    expectedRevision: string;
}

export interface MappingSource {
    sourceAllocationId?: number;
    kind: MappingKind;
    adapterId: number;
    adapterName: string;
    targetEntityId: number;
    namespaceName: string;
    logicalTableName: string;
}

export interface MappingCreate extends MappingDraft {
    existingTargetEntityId?: number;
    sourceAllocationId?: number;
    adapterId: number;
    targetEntityId: number;
    expectedRevision: string;
}

export interface MappingError {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    blockingEntities?: string[];
}
