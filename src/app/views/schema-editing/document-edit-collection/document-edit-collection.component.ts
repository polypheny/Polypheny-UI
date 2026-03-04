import {Component, effect, inject, Input, OnDestroy, OnInit, Signal, untracked} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {RelationalResult} from '../../../components/data-view/models/result-set.model';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {Method, QueryRequest} from '../../../models/ui-request.model';
import {AdapterModel} from '../../adapters/adapter.model';
import {Subscription} from 'rxjs';
import {CatalogService} from '../../../services/catalog.service';
import {
    AllocationEntityModel,
    AllocationPartitionModel,
    AllocationPlacementModel,
    NamespaceModel,
    TableModel
} from '../../../models/catalog.model';
import {SchemaBuilderSave, ValidationAction} from '../document-schema-builder/document-schema-builder.component';

type SchemaRow = {
    id: string;
    parentId: string | null;
    hasChildren: boolean;

    name: string;
    path: string;
    level: number;
    kind: 'scalar' | 'object' | 'array' | 'oneOf';
    /** For scalar nodes: either a single type or a union display like "text | null" */
    scalarType?: string;
    constraints: string;
    /** null means "not applicable" (items/options). */
    required: boolean | null;
};

@Component({
    selector: 'app-document-edit-collection',
    templateUrl: './document-edit-collection.component.html',
    styleUrls: ['./document-edit-collection.component.scss']
})
export class DocumentEditCollectionComponent implements OnInit, OnDestroy {

    public readonly _crud = inject(CrudService);
    public readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);

    constructor() {
        // Reload schema whenever the selected entity/namespace changes
        effect(() => {
            const ns = this.namespace?.();
            const ent = this.entity?.();
            if (!ns || !ent) {
                return;
            }
            untracked(() => {
                // Avoid carrying editor state across navigation
                this.schemaEditMode = false;
                this.showSchemaJson = false;
                this.schemaExpanded = {};
                this.loadSchema();
            });
        });
    }

    @Input() readonly entity: Signal<TableModel>;
    @Input() readonly namespace: Signal<NamespaceModel>;
    @Input() readonly currentRoute: Signal<string>;

    @Input() readonly placements: Signal<AllocationPlacementModel[]>;
    @Input() readonly partitions: Signal<AllocationPartitionModel[]>;
    @Input() readonly allocations: Signal<AllocationEntityModel[]>;
    @Input() readonly stores: Signal<AdapterModel[]>;
    @Input() readonly addableStores: Signal<AdapterModel[]>;

    selectedStore: AdapterModel;
    placementMethod: Method;
    isAddingPlacement = false;

    subscriptions = new Subscription();
    protected readonly Method = Method;

    // Schema UI state
    schemaLoading = false;
    hasSchema = false;
    currentDocSchema: any | null = null;
    currentValidationAction: ValidationAction = 'off';
    schemaEditMode = false;
    showSchemaJson = false;

    schemaRootAdditionalProperties = true;
    schemaRows: SchemaRow[] = [];
    // Internal tree state (for fold/unfold)
    private schemaAllRows: SchemaRow[] = [];
    private schemaRowById: Record<string, SchemaRow> = {};
    private schemaParentById: Record<string, string | null> = {};
    private schemaParentsWithChildren = new Set<string>();
    /** Expanded state for rows that have children. Default: expanded. */
    private schemaExpanded: Record<string, boolean> = {};


    ngOnInit() {
        this.loadSchema();
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }


    // Schema helpers

    private normalizeValidationAction(v: any): ValidationAction {
        const s = (v ?? 'off').toString().trim().toLowerCase();
        if (s === 'strict' || s === 'error') {
            return 'strict';
        }
        if (s === 'warn' || s === 'warning') {
            return 'warn';
        }
        return 'off';
    }

    private parseJsonIfString(v: any): any {
        if (typeof v !== 'string') {
            return v;
        }
        try {
            return JSON.parse(v);
        } catch {
            return v;
        }
    }

    private unwrapAnyQueryResponse(res: any): any {
        if (Array.isArray(res)) {
            return res.length > 0 ? res[0] : null;
        }
        return res;
    }


    // Load / apply schema

    loadSchema() {
        const ns = this.namespace?.();
        const ent = this.entity?.();
        if (!ns || !ent) {
            return;
        }

        this.schemaLoading = true;

        const query = `db.getCollectionSchema(${JSON.stringify(ent.name)})`;
        const request = new QueryRequest(query, false, false, 'mongo', ns.name);

        this._crud.anyQueryBlocking(request).subscribe({
            next: (res: any) => {
                const r = this.unwrapAnyQueryResponse(res);

                if (!r) {
                    this.hasSchema = false;
                    this.currentDocSchema = null;
                    this.currentValidationAction = 'off';
                    this.schemaRows = [];
                    return;
                }
                if (r.error || r.exception) {
                    this._toast.exception(r, 'Could not load collection schema:');
                    this.hasSchema = false;
                    this.currentDocSchema = null;
                    this.currentValidationAction = 'off';
                    this.schemaRows = [];
                    return;
                }

                // response: r.data is array of JSON strings
                const raw0 = r?.data?.[0];
                const row = this.parseJsonIfString(raw0);

                // payload: row.schema.docSchema + row.schema.validationAction
                const schemaObj = this.parseJsonIfString(row?.schema);
                const docSchema = this.parseJsonIfString(schemaObj?.docSchema);
                const va = schemaObj?.validationAction ?? schemaObj?.enforcement ?? 'OFF';

                this.currentValidationAction = this.normalizeValidationAction(va);
                this.currentDocSchema = docSchema ?? null;
                this.hasSchema = !!(docSchema && typeof docSchema === 'object' && docSchema.properties);

                this.rebuildSchemaRows();
            },
            error: err => {
                this._toast.error('Could not load collection schema due to an unknown error.');
                console.log(err);
                this.hasSchema = false;
                this.currentDocSchema = null;
                this.currentValidationAction = 'off';
                this.schemaRows = [];
            }
        }).add(() => {
            this.schemaLoading = false;
        });
    }

    enterSchemaEdit() {
        this.showSchemaJson = false;
        this.schemaEditMode = true;
    }

    cancelSchemaEdit() {
        this.showSchemaJson = false;
        this.schemaEditMode = false;
    }

    applySchemaFromBuilder(e: SchemaBuilderSave) {
        const ns = this.namespace?.();
        const ent = this.entity?.();
        if (!ns || !ent) {
            return;
        }

        const docSchemaLiteral = JSON.stringify(e.docSchema);
        const query =
            `db.alterCollectionSchema(${JSON.stringify(ent.name)}, { docSchema: ${docSchemaLiteral}, validationAction: "${e.validationAction}" })`;

        // IMPORTANT: cache=false, lang="mongo"
        const request = new QueryRequest(query, false, false, 'mongo', ns.name);

        this.schemaLoading = true;
        this._crud.anyQueryBlocking(request).subscribe({
            next: (res: any) => {
                const r = this.unwrapAnyQueryResponse(res);
                if (r?.error || r?.exception) {
                    this._toast.exception(r ?? res, 'Could not alter collection schema:');
                    return;
                }
                this._toast.success('Updated schema for ' + ent.name, r?.query ?? query);
                this.showSchemaJson = false;
                this.schemaEditMode = false;
                this.loadSchema();
            },
            error: err => {
                this._toast.error('Could not alter collection schema due to an unknown error.');
                console.log(err);
            }
        }).add(() => {
            this.schemaLoading = false;
        });
    }

    // Schema tree (read-only) with fold/unfold

    isRowExpanded(id: string): boolean {
        return this.schemaExpanded[id] !== false;
    }

    toggleRow(id: string) {
        this.schemaExpanded[id] = !this.isRowExpanded(id);
        this.applySchemaVisibility();
    }

    expandAllSchemaRows() {
        for (const id of this.schemaParentsWithChildren) {
            this.schemaExpanded[id] = true;
        }
        this.applySchemaVisibility();
    }

    collapseAllSchemaRows() {
        for (const id of this.schemaParentsWithChildren) {
            this.schemaExpanded[id] = false;
        }
        this.applySchemaVisibility();
    }

    private applySchemaVisibility() {
        this.schemaRows = this.schemaAllRows.filter(r => this.isRowVisible(r.id));
    }

    private isRowVisible(id: string): boolean {
        let p = this.schemaParentById[id];
        while (p) {
            if (this.schemaParentsWithChildren.has(p) && this.schemaExpanded[p] === false) {
                return false;
            }
            p = this.schemaParentById[p];
        }
        return true;
    }

    private pushRow(row: Omit<SchemaRow, 'id' | 'parentId' | 'hasChildren'>, parentId: string | null) {
        const id = row.path;
        const full: SchemaRow = {
            ...row,
            id,
            parentId,
            hasChildren: false
        };

        this.schemaAllRows.push(full);
        this.schemaRowById[id] = full;
        this.schemaParentById[id] = parentId;

        if (parentId) {
            this.schemaParentsWithChildren.add(parentId);
        }
    }


    // Schema table builder

    private rebuildSchemaRows() {
        // Reset derived structures but keep existing expanded state (path-based)
        this.schemaRows = [];
        this.schemaAllRows = [];
        this.schemaRowById = {};
        this.schemaParentById = {};
        this.schemaParentsWithChildren = new Set<string>();
        this.schemaRootAdditionalProperties = true;

        const schema = this.currentDocSchema;
        if (!schema || typeof schema !== 'object') {
            return;
        }

        this.schemaRootAdditionalProperties = schema.additionalProperties !== undefined ? !!schema.additionalProperties : true;

        const props = schema.properties;
        if (!props || typeof props !== 'object') {
            return;
        }

        const rootReq = Array.isArray(schema.required)
            ? new Set<string>(schema.required.map((x: any) => String(x)))
            : null;

        this.visitProperties(props, '$', 0, rootReq, null);

        // Mark rows that have children and set default expanded state
        for (const pid of this.schemaParentsWithChildren) {
            const r = this.schemaRowById[pid];
            if (r) {
                r.hasChildren = true;
            }
            if (this.schemaExpanded[pid] === undefined) {
                this.schemaExpanded[pid] = true;
            }
        }

        this.applySchemaVisibility();
    }

    private visitProperties(props: any, basePath: string, level: number, requiredSet: Set<string> | null, parentId: string | null) {
        for (const key of Object.keys(props)) {
            const spec = props[key];
            const req = requiredSet ? requiredSet.has(key) : true;
            this.visitNode(key, spec, `${basePath}.${key}`, level, req, parentId);
        }
    }

    private visitNode(name: string, spec: any, path: string, level: number, required: boolean | null, parentId: string | null) {
        const kind = this.kindOf(spec);

        if (kind === 'oneOf') {
            const options = Array.isArray(spec?.oneOf) ? spec.oneOf : [];
            this.pushRow({
                name,
                path,
                level,
                kind,
                constraints: `options=${options.length}`,
                required
            }, parentId);

            options.forEach((opt: any, idx: number) => {
                const optName = `option ${idx + 1}`;
                const optPath = `${path}.oneOf[${idx + 1}]`;
                // option is synthetic -> required not applicable
                this.visitNode(optName, opt, optPath, level + 1, null, path);
            });
            return;
        }

        if (kind === 'object') {
            this.pushRow({
                name,
                path,
                level,
                kind,
                constraints: this.formatObjectConstraints(spec),
                required
            }, parentId);

            const childProps = (spec && typeof spec === 'object') ? (spec.properties ?? null) : null;
            if (childProps && typeof childProps === 'object') {
                const childReq = Array.isArray(spec?.required)
                    ? new Set<string>(spec.required.map((x: any) => String(x)))
                    : null;
                this.visitProperties(childProps, path, level + 1, childReq, path);
            }
            return;
        }

        if (kind === 'array') {
            this.pushRow({
                name,
                path,
                level,
                kind,
                constraints: this.formatArrayConstraints(spec),
                required
            }, parentId);

            // Synthetic items row
            const itemsSpec = (spec && typeof spec === 'object') ? spec.items : null;
            const itemsKind = this.kindOf(itemsSpec);
            const itemsPath = `${path}[]`;

            this.pushRow({
                name: 'items',
                path: itemsPath,
                level: level + 1,
                kind: itemsKind,
                scalarType: itemsKind === 'scalar' ? this.scalarTypeOf(itemsSpec) : undefined,
                constraints: this.formatConstraints(itemsSpec),
                required: null
            }, path);

            if (itemsKind === 'object' && itemsSpec?.properties) {
                const itemsReq = Array.isArray(itemsSpec?.required)
                    ? new Set<string>(itemsSpec.required.map((x: any) => String(x)))
                    : null;
                this.visitProperties(itemsSpec.properties, itemsPath, level + 2, itemsReq, itemsPath);
            } else if (itemsKind === 'array' || itemsKind === 'oneOf') {
                this.visitNode('items', itemsSpec, itemsPath, level + 2, null, itemsPath);
            }

            return;
        }

        // scalar
        const scalarType = this.scalarTypeOf(spec);
        this.pushRow({
            name,
            path,
            level,
            kind: 'scalar',
            scalarType,
            constraints: this.formatScalarConstraints(spec, scalarType),
            required
        }, parentId);
    }


    private kindOf(spec: any): 'scalar' | 'object' | 'array' | 'oneOf' {
        if (spec == null) return 'scalar';
        if (typeof spec === 'string') return 'scalar';
        if (typeof spec !== 'object') return 'scalar';
        if (Array.isArray(spec.oneOf)) return 'oneOf';
        if (spec.type === 'object' || spec.properties) return 'object';
        if (spec.type === 'array' || spec.items) return 'array';
        return 'scalar';
    }

    private scalarTypeOf(spec: any): string {
        if (typeof spec === 'string') return spec;
        if (spec && typeof spec === 'object') {
            const t = spec.type;
            if (Array.isArray(t)) {
                return t.map((x: any) => String(x)).join(' | ');
            }
            if (t != null) {
                return String(t);
            }
        }
        return 'text';
    }

    private formatConstraints(spec: any): string {
        const k = this.kindOf(spec);
        if (k === 'scalar') return this.formatScalarConstraints(spec, this.scalarTypeOf(spec));
        if (k === 'array') return this.formatArrayConstraints(spec);
        if (k === 'oneOf') {
            const len = Array.isArray(spec?.oneOf) ? spec.oneOf.length : 0;
            return `options=${len}`;
        }
        return this.formatObjectConstraints(spec);
    }

    private formatObjectConstraints(spec: any): string {
        const count = (spec?.properties && typeof spec.properties === 'object')
            ? Object.keys(spec.properties).length
            : 0;

        const ap = spec?.additionalProperties;
        const apBool = ap !== undefined ? !!ap : true;

        const reqLen = Array.isArray(spec?.required) ? spec.required.length : null;

        const parts: string[] = [];
        parts.push(count > 0 ? `${count} properties` : '0 properties');
        parts.push(`additionalProperties=${apBool ? 'allow' : 'forbid'}`);
        if (reqLen !== null) {
            parts.push(`required=${reqLen}/${count}`);
        }

        return parts.join(', ');
    }

    private formatArrayConstraints(spec: any): string {
        if (!spec || typeof spec !== 'object') return '—';
        const parts: string[] = [];
        if (spec.minItems !== undefined && spec.minItems !== null) parts.push(`minItems=${spec.minItems}`);
        if (spec.uniqueItems !== undefined && spec.uniqueItems !== null) parts.push(`uniqueItems=${!!spec.uniqueItems}`);
        return parts.length ? parts.join(', ') : '—';
    }

    private formatScalarConstraints(spec: any, tDisplay: string): string {
        if (typeof spec === 'string' || spec == null || typeof spec !== 'object') return '—';

        const parts: string[] = [];

        const typeTokens: string[] = (() => {
            const tt = spec.type;
            if (Array.isArray(tt)) {
                return tt.map((x: any) => String(x).toLowerCase());
            }
            if (tt != null) {
                return [String(tt).toLowerCase()];
            }
            // fallback: infer from display
            return (tDisplay ?? '').split('|').map((x: string) => x.trim().toLowerCase()).filter(Boolean);
        })();

        const isString = typeTokens.includes('text') || typeTokens.includes('string');
        const isNumber = typeTokens.includes('number') || typeTokens.includes('integer') || typeTokens.includes('int')
            || typeTokens.includes('decimal') || typeTokens.includes('double') || typeTokens.includes('float');

        if (isString) {
            if (spec.minLength !== undefined && spec.minLength !== null) parts.push(`minLength=${spec.minLength}`);
            if (spec.maxLength !== undefined && spec.maxLength !== null) parts.push(`maxLength=${spec.maxLength}`);
            if (spec.pattern) parts.push(`pattern=${spec.pattern}`);
        }

        if (isNumber) {
            if (spec.minimum !== undefined && spec.minimum !== null) parts.push(`minimum=${spec.minimum}`);
            if (spec.maximum !== undefined && spec.maximum !== null) parts.push(`maximum=${spec.maximum}`);
        }

        return parts.length ? parts.join(', ') : '—';
    }


    // Placements

    modifyPlacement(method: Method, storeId: number = null) {
        this.placementMethod = method;
        if (storeId != null) {
            this.selectedStore = this._catalog.getAdapter(storeId);
        }
        if (!this.stores) {
            return;
        }
        this.isAddingPlacement = true;
        this._crud.addDropCollectionPlacement(this.namespace().name, this.entity().name, this.selectedStore.name, this.placementMethod).subscribe({
                next: (result: RelationalResult) => {
                    if (result.error) {
                        this._toast.exception(result);
                    } else {
                        if (this.placementMethod === Method.ADD) {
                            this._toast.success('Added placement on store ' + this.selectedStore.name, result.query, 'Added placement');
                        } else if (this.placementMethod === Method.MODIFY) {
                            this._toast.success('Modified placement on store ' + this.selectedStore.name, result.query, 'Modified placement');
                        }
                    }
                    this.selectedStore = null;
                }, error: err => {
                    this._toast.error('Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.name);
                }
            }
        ).add(() => {
            this.isAddingPlacement = false;
        });
    }
}
