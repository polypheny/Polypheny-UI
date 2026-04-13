import {Component, effect, OnInit, untracked} from '@angular/core';
import {DataTemplateComponent} from '../data-template/data-template.component';
import {DataModel, QueryRequest} from '../../../models/ui-request.model';

@Component({
    selector: 'app-data-card',
    templateUrl: './data-card.component.html',
    styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent extends DataTemplateComponent implements OnInit {

    constructor() {
        super();

        effect(() => {
            const route = this.currentRoute?.();
            const res = this.$result?.();
            const ent = this.entity?.();

            if (!route || !res || !ent) {
                return;
            }

            if (res.dataModel !== DataModel.DOCUMENT) {
                untracked(() => this.resetDocumentInsertState());
                return;
            }

            const key = `${res.namespace}.${ent.name}`;
            if (this._schemaKey === key) {
                return;
            }

            untracked(() => {
                this._schemaKey = key;
                this.showInsertCard = false;
                this.docSchema = null;
                this.requiredPaths = [];
                this.loadSchema(res.namespace, ent.name);
            });
        });
    }

    showInsertCard = false;
    jsonValid = false;

    schemaLoading = false;
    docSchema: any | null = null;
    requiredPaths: string[] = [];
    includeOptionalInTemplate = true;

    /**
     * Used to recreate the json editor after template injection,
     * because the editor otherwise keeps the old value until manual interaction.
     */
    documentEditorVisible = true;

    private _schemaKey: string | null = null;

    protected readonly DataModel = DataModel;

    ngOnInit(): void {
        super.ngOnInit();
        if (this.entityConfig && this.entityConfig().create) {
            this.buildInsertObject();
        }
        this.setPagination();
    }

    setJsonValid($event: any) {
        this.jsonValid = $event;
    }

    showInsert() {
        this.editing = null;
        this.showInsertCard = true;

        if (this.entityConfig && this.entityConfig().create) {
            this.buildInsertObject();
        }

        if (this.$result()?.dataModel === DataModel.DOCUMENT) {
            this.ensureDocumentJsonSeed();
            this.jsonValid = true;
            this.refreshDocumentEditor();
        }
    }

    get hasDocSchema(): boolean {
        return !!(this.docSchema && typeof this.docSchema === 'object' && this.docSchema.properties);
    }

    get requiredPathsPreview(): string[] {
        return (this.requiredPaths ?? []).slice(0, 10);
    }

    get requiredPathsOverflow(): number {
        return Math.max(0, (this.requiredPaths?.length ?? 0) - this.requiredPathsPreview.length);
    }

    /**
     * This now mirrors the playground behavior:
     * generate a JSON template from the schema and immediately put it into the insert editor.
     */
    applySchemaTemplateJson() {
        if (this.$result()?.dataModel !== DataModel.DOCUMENT) {
            return;
        }
        if (!this.hasDocSchema) {
            this._toast.warn('No schema available to generate a template.');
            return;
        }

        if (!this.showInsertCard) {
            this.showInsert();
        }

        const col = this.getDocJsonColumnName();
        if (!col) {
            return;
        }

        const template = this.templateFromObjectSchema(this.docSchema, 0, this.includeOptionalInTemplate);
        const templateText = JSON.stringify(template ?? {}, null, 2);

        // IMPORTANT: use the same path as normal editor updates
        this.inputChange(col, templateText);
        this.jsonValid = true;

        // Force the editor to pick up the new input immediately
        this.refreshDocumentEditor();
    }

    private resetDocumentInsertState() {
        this._schemaKey = null;
        this.schemaLoading = false;
        this.docSchema = null;
        this.requiredPaths = [];
        this.showInsertCard = false;
        this.documentEditorVisible = true;
    }

    private loadSchema(nsName: string, collectionName: string) {
        this.schemaLoading = true;

        const query = `db.getCollectionSchema(${JSON.stringify(collectionName)})`;
        const request = new QueryRequest(query, false, false, 'mongo', nsName);

        this._crud.anyQueryBlocking(request).subscribe({
            next: (res: any) => {
                const r = this.unwrapAnyQueryResponse(res);

                if (!r || r.error || r.exception) {
                    this.docSchema = null;
                    this.requiredPaths = [];
                    return;
                }

                const raw0 = r?.data?.[0];
                const row = this.parseJsonIfString(raw0);

                const schemaObj = this.parseJsonIfString(row?.schema);
                const docSchema = this.parseJsonIfString(schemaObj?.docSchema);

                this.docSchema = (docSchema && typeof docSchema === 'object') ? docSchema : null;
                this.requiredPaths = this.docSchema ? this.collectRequiredPaths(this.docSchema) : [];
            },
            error: err => {
                console.log(err);
                this.docSchema = null;
                this.requiredPaths = [];
            }
        }).add(() => {
            this.schemaLoading = false;
        });
    }

    private unwrapAnyQueryResponse(res: any): any {
        if (Array.isArray(res)) {
            return res.length > 0 ? res[0] : null;
        }
        return res;
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

    private getDocJsonColumnName(): string | null {
        const header = this.$result()?.header;
        if (!Array.isArray(header) || header.length === 0) {
            return null;
        }

        const idCol = header.find((h: any) => h?.name === '_id');
        if (idCol) {
            return '_id';
        }

        if (header.length === 1 && header[0]?.name) {
            return header[0].name;
        }

        const dataCol = header.find((h: any) => h?.name === '_data');
        return dataCol?.name ?? (header[0]?.name ?? null);
    }

    private ensureDocumentJsonSeed() {
        const col = this.getDocJsonColumnName();
        if (!col) {
            return;
        }

        const current = this.insertValues.get(col);
        if (current == null || (typeof current === 'string' && current.trim().length === 0)) {
            this.inputChange(col, '{\n  \n}');
            this.jsonValid = true;
        }
    }

    private refreshDocumentEditor() {
        this.documentEditorVisible = false;
        setTimeout(() => {
            this.documentEditorVisible = true;
            try {
                window.dispatchEvent(new Event('resize'));
            } catch {
                // ignore
            }
        }, 0);
    }

    private collectRequiredPaths(schema: any): string[] {
        const out: string[] = [];
        this.collectRequiredPathsRec(schema, '', 0, out);
        return out;
    }

    private collectRequiredPathsRec(schema: any, base: string, depth: number, out: string[]) {
        if (!schema || typeof schema !== 'object') return;
        if (depth > 6) return;

        const props = schema.properties;
        if (!props || typeof props !== 'object') return;

        const requiredList: string[] | null = Array.isArray(schema.required)
            ? schema.required.map((x: any) => String(x))
            : null;

        const requiredSet = requiredList ? new Set<string>(requiredList) : new Set<string>(Object.keys(props));

        for (const key of Object.keys(props)) {
            if (!requiredSet.has(key)) continue;

            const p = base ? `${base}.${key}` : key;
            out.push(p);

            const child = props[key];

            if (child && typeof child === 'object' && (child.type === 'object' || child.properties)) {
                this.collectRequiredPathsRec(child, p, depth + 1, out);
            } else if (child && typeof child === 'object' && (child.type === 'array' || child.items)) {
                const items = child.items;
                if (items && typeof items === 'object' && (items.type === 'object' || items.properties)) {
                    this.collectRequiredPathsRec(items, `${p}[]`, depth + 1, out);
                }
            }
        }
    }

    /**
     * Same logic as in document-schema-playground, with optional-field toggle support.
     */
    private templateFromObjectSchema(schema: any, depth: number, includeOptional: boolean): any {
        if (!schema || typeof schema !== 'object') return {};
        if (depth > 6) return {};

        const props = schema.properties;
        if (!props || typeof props !== 'object') return {};

        const requiredList: string[] | null = Array.isArray(schema.required)
            ? schema.required.map((x: any) => String(x))
            : null;

        const requiredSet = requiredList ? new Set<string>(requiredList) : new Set<string>(Object.keys(props));

        const out: any = {};
        for (const key of Object.keys(props)) {
            const isReq = requiredSet.has(key);
            if (!includeOptional && !isReq) continue;
            out[key] = this.templateFromNode(props[key], depth + 1, includeOptional);
        }
        return out;
    }

    private templateFromNode(spec: any, depth: number, includeOptional: boolean): any {
        if (depth > 6) return null;
        if (spec == null) return null;

        if (typeof spec === 'object' && Array.isArray(spec.oneOf) && spec.oneOf.length > 0) {
            return this.templateFromNode(spec.oneOf[0], depth + 1, includeOptional);
        }

        if (typeof spec === 'object' && (spec.type === 'object' || spec.properties)) {
            return this.templateFromObjectSchema(spec, depth + 1, includeOptional);
        }

        if (typeof spec === 'object' && (spec.type === 'array' || spec.items)) {
            return [];
        }

        const types: string[] = (() => {
            if (typeof spec === 'string') return [spec];
            if (typeof spec === 'object') {
                const t = spec.type;
                if (Array.isArray(t)) return t.map((x: any) => String(x));
                if (t != null) return [String(t)];
            }
            return ['text'];
        })();

        const ts = types.map(t => t.toLowerCase());
        if (ts.includes('null') && ts.length === 1) return null;

        if (ts.includes('text') || ts.includes('string')) return '';
        if (ts.includes('boolean') || ts.includes('bool')) return false;
        if (ts.includes('number') || ts.includes('integer') || ts.includes('int') || ts.includes('double') || ts.includes('float') || ts.includes('decimal')) return 0;

        return null;
    }
}