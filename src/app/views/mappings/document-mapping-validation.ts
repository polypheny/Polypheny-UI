import {inject, Injectable} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {AbstractControl, ValidationErrors} from '@angular/forms';
import {EMPTY, Observable} from 'rxjs';
import {catchError, filter, finalize, ignoreElements, map, skip, tap} from 'rxjs/operators';
import {DataModel} from '../../models/ui-request.model';
import {CatalogService} from '../../services/catalog.service';
import {MappingService} from '../../services/mapping.service';
import {DocumentMappingDetail, MappingError, MappingSummary} from './mapping.model';

export type DocumentMappingField = 'mappingName' | 'logicalCollectionName' | 'targetNamespaceId';

@Injectable()
export class DocumentMappingValidation {
    private readonly catalog = inject(CatalogService);
    private readonly mappings = inject(MappingService);
    private summaries: MappingSummary[] = [];
    readonly catalogUpdates = toObservable(this.catalog.listener).pipe(skip(1), filter(Boolean));
    loadingSummaries = false;
    summaryError = false;

    loadSummaries(revalidate: () => void, list?: Observable<MappingSummary[]>) {
        this.loadingSummaries = true;
        this.summaryError = false;
        return (list ?? this.mappings.getMappings().pipe(map(response => response.mappings))).pipe(
            tap(summaries => {
                this.summaries = summaries;
                revalidate();
            }),
            catchError(() => {
                this.summaryError = true;
                return EMPTY;
            }),
            finalize(() => this.loadingSummaries = false),
            ignoreElements()
        );
    }

    mappingName(value: string, detail: DocumentMappingDetail): ValidationErrors | null {
        if (!detail) {
            return null;
        }
        const name = (value ?? '').trim();
        if (!name || name.length > detail.validation.mappingNameMaxLength) {
            return {mappingName: true};
        }
        const key = name.toLowerCase();
        return this.summaries.some(mapping => mapping.mappingId !== detail.mappingId && mapping.mappingName.trim().toLowerCase() === key)
            ? {duplicateMappingName: true} : null;
    }

    collectionName(value: string, detail: DocumentMappingDetail, namespaceId: number): ValidationErrors | null {
        if (!detail) {
            return null;
        }
        const name = (value ?? '').trim();
        const {identifierPattern, identifierMaxLength} = detail.validation;
        const creating = detail.mappingId < 0;
        if (!name || ((creating || name !== detail.logicalCollectionName) &&
            (name.length > identifierMaxLength || !new RegExp(`^(?:${identifierPattern})$`).test(name)))) {
            return {identifier: true};
        }

        const caseSensitive = this.catalog.namespaces().get(namespaceId)?.caseSensitive ?? detail.namespaceCaseSensitive;
        const key = caseSensitive ? name : name.toLowerCase();
        return Array.from(this.catalog.entities().values()).some(entity => entity.namespaceId === namespaceId
            && entity.dataModel === DataModel.DOCUMENT && (creating || entity.id !== detail.targetEntityId)
            && (caseSensitive ? entity.name : entity.name.toLowerCase()) === key)
            ? {duplicateEntityName: true} : null;
    }

    fieldError(control: AbstractControl, field: DocumentMappingField, detail: DocumentMappingDetail, saveError: MappingError): string | null {
        const serverError = saveError?.fieldErrors?.[field];
        if (serverError || !detail || !control.invalid) {
            return serverError ?? null;
        }
        if (control.hasError('duplicateMappingName')) {
            return 'A mapping with this name already exists.';
        }
        if (control.hasError('duplicateEntityName')) {
            return 'An entity with this name already exists in the namespace.';
        }
        if (field === 'targetNamespaceId') {
            return 'Choose a visible document namespace.';
        }
        return field === 'mappingName' ? detail.validation.mappingNameMessage : detail.validation.identifierMessage;
    }
}

export function clearDocumentFieldErrors(error: MappingError, ...fields: DocumentMappingField[]): MappingError {
    if (!fields.some(field => error?.fieldErrors?.[field])) {
        return error;
    }
    const fieldErrors = {...error.fieldErrors};
    fields.forEach(field => delete fieldErrors[field]);
    return Object.keys(fieldErrors).length ? {...error, fieldErrors} : null;
}
