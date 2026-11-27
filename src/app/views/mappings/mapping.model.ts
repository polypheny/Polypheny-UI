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

export function mappingDetailLink(mapping: Pick<MappingSummary, 'mappingId' | 'targetModel' | 'editable'>, adapterId?: number): (string | number)[] {
    const base = adapterId == null ? ['/views/mappings'] : ['/views/adapters', adapterId, 'mappings'];
    if (mapping.targetModel === DataModel.DOCUMENT) {
        return [...base, 'document', mapping.mappingId];
    }
    return [...base, mapping.mappingId, ...(adapterId == null && mapping.editable ? ['edit'] : [])];
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
    type?: string;
    targetTypeOptions?: string[];
    precision?: number;
    scale?: number;
    nullable: boolean;
    included: boolean;
    physicalReferences: {
        allocationId: number;
        physicalEntityId: number;
        physicalColumnId: number;
        physicalName: string;
        physicalPosition: number;
        typeDisplay: string;
        primary?: boolean;
        type?: string;
        precision?: number;
        scale?: number;
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
    excludedColumnRules?: Record<number, string>;
    validation: MappingValidation;
    availableRules?: {type: string; label: string}[];
    typeParameters?: Record<string, MappingTypeParameters>;
}

export interface DocumentMappingDetail extends Omit<MappingSummary, 'logicalTableName' | 'removesTarget'> {
    fixedTargetEntityId?: number;
    targetModel: DataModel.DOCUMENT;
    logicalCollectionName: string;
    namespaceId: number;
    namespaceCaseSensitive: boolean;
    sourceAllocationId: number;
    revision: string;
    physicalSources: PhysicalSourceReference[];
    rules: MappingRule[];
    validation: MappingValidation;
}

export interface DocumentMappingSourceKey {
    adapterId: number;
    sourceEntityId: number;
    sourceAllocationId: number;
}

export interface DocumentMappingSource extends DocumentMappingSourceKey {
    adapterName: string;
    namespaceName: string;
    physicalName: string;
}

export interface DocumentMappingCreate extends DocumentMappingSourceKey {
    existingTargetEntityId?: number;
    expectedRevision: string;
    targetNamespaceId: number;
    mappingName: string;
    logicalCollectionName: string;
}

export interface DocumentMappingUpdate {
    adapterId: number;
    mappingId: number;
    expectedRevision: string;
    targetNamespaceId: number;
    mappingName: string;
    logicalCollectionName: string;
}

export function isDocumentMappingDetail(detail: MappingDetail | DocumentMappingDetail): detail is DocumentMappingDetail {
    return detail.targetModel === DataModel.DOCUMENT;
}

export interface MappingTypeParameters {
    minPrecision: number;
    maxPrecision?: number;
    defaultPrecision?: number;
    maxScale?: number;
    defaultScale?: number;
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
    columns: { logicalColumnId: number; logicalName: string; included: boolean; targetType?: string; targetNullable?: boolean;
        targetPrecision?: number; targetScale?: number; ruleType?: string }[];
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

export interface MappingConversionRequest {
    adapterId: number;
    expectedRevision: string;
    mappingId?: number;
    targetEntityId?: number;
    existingTargetEntityId?: number;
    sourceAllocationId?: number;
    columns: Omit<MappingDraft['columns'][number], 'targetNullable'>[];
}

export interface MappingColumnCheck {
    logicalColumnId: number;
    checkedRecords: number;
    errors: {recordNumber: number; error: MappingError}[];
}

export interface MappingConversionValidation {
    columns: MappingColumnCheck[];
}
