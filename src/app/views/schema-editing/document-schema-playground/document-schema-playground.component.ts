import {Component, inject, Input, Signal} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {NamespaceModel, TableModel} from '../../../models/catalog.model';

export type PlaygroundViolation = {
    path: string;
    code: string;
    message: string;
};

export type PlaygroundDocResult = {
    index: number;
    ok: boolean;
    violations: PlaygroundViolation[];
    parseError?: string | null;
};

export type ValidateDocumentsResponse = {
    ok: boolean;
    /** Whether an INSERT would be accepted under the current validationAction (OFF/WARN allow writes even if ok=false). */
    allowed: boolean;
    hasSchema: boolean;
    enforcement: string;
    results: PlaygroundDocResult[];
    error?: string;
};

@Component({
    selector: 'app-document-schema-playground',
    templateUrl: './document-schema-playground.component.html',
    styleUrls: ['./document-schema-playground.component.scss']
})
export class DocumentSchemaPlaygroundComponent {

    private readonly _crud = inject(CrudService);
    private readonly _toast = inject(ToasterService);

    @Input() readonly entity: Signal<TableModel>;
    @Input() readonly namespace: Signal<NamespaceModel>;

    /** Optional, used for the "Generate template" button. */
    @Input() docSchema: any | null = null;

    jsonText = '{\n  \n}';
    maxViolationsPerDocument = 25;

    loading = false;
    parseError: string | null = null;
    response: ValidateDocumentsResponse | null = null;


    validate() {
        const ns = this.namespace?.();
        const ent = this.entity?.();
        if (!ns || !ent) {
            return;
        }

        this.parseError = null;
        this.response = null;

        let parsed: any;
        try {
            parsed = JSON.parse(this.jsonText);
        } catch (e: any) {
            this.parseError = e?.message ?? 'Invalid JSON.';
            return;
        }

        const docs: any[] = Array.isArray(parsed) ? parsed : [parsed];

        for (const d of docs) {
            if (d == null || typeof d !== 'object' || Array.isArray(d)) {
                this.parseError = 'Playground expects a JSON object or an array of JSON objects.';
                return;
            }
        }

        this.loading = true;
        this._crud.validateDocuments(ns.name, ent.name, docs, this.maxViolationsPerDocument).subscribe({
            next: (res: any) => {
                this.response = res as ValidateDocumentsResponse;

                if (this.response?.error) {
                    this._toast.error(this.response.error);
                    return;
                }

                if (this.response?.ok) {
                    this._toast.success('Document(s) conform to the schema.');
                } else if (this.response?.allowed) {
                    this._toast.warn('Schema violations found (but inserts would still be allowed in warn/off).');
                } else {
                    this._toast.error('Schema violations found (in strict mode this would be rejected).');
                }
            },
            error: err => {
                console.log(err);
                this._toast.error('Could not validate documents due to an unknown error.');
                this.response = {
                    ok: false,
                    allowed: false,
                    hasSchema: false,
                    enforcement: 'OFF',
                    results: [],
                    error: 'Request failed.'
                };
            }
        }).add(() => {
            this.loading = false;
        });
    }

    clear() {
        this.jsonText = '{\n  \n}';
        this.parseError = null;
        this.response = null;
    }

    generateTemplate() {
        if (!this.docSchema || typeof this.docSchema !== 'object') {
            this._toast.warn('No schema available to generate a template.');
            return;
        }
        const template = this.templateFromObjectSchema(this.docSchema, 0);
        this.jsonText = JSON.stringify(template ?? {}, null, 2);
        this.parseError = null;
        this.response = null;
    }

    private templateFromObjectSchema(schema: any, depth: number): any {
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
            if (!requiredSet.has(key)) continue;
            out[key] = this.templateFromNode(props[key], depth + 1);
        }
        return out;
    }

    private templateFromNode(spec: any, depth: number): any {
        if (depth > 6) return null;
        if (spec == null) return null;

        if (typeof spec === 'object' && Array.isArray(spec.oneOf) && spec.oneOf.length > 0) {
            return this.templateFromNode(spec.oneOf[0], depth + 1);
        }

        if (typeof spec === 'object' && (spec.type === 'object' || spec.properties)) {
            return this.templateFromObjectSchema(spec, depth + 1);
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