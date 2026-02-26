import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';

export type ValidationAction = 'off' | 'warn' | 'strict';
export type NodeKind = 'scalar' | 'object' | 'array';

/**
 * Node specification used by the UI builder (independent of the backend JSON shape).
 * - Scalar: kind=scalar + scalarType + optional constraints
 * - Object: kind=object + properties[]
 * - Array:  kind=array + items + optional array constraints
 */
export interface SchemaNodeSpec {
    kind: NodeKind;

    // scalar
    scalarType?: string; // e.g. "text", "string", "number", "boolean", "null"
    minLength?: number | null;
    maxLength?: number | null;
    pattern?: string | null;

    minimum?: number | null;
    exclusiveMinimum?: number | null;
    maximum?: number | null;
    exclusiveMaximum?: number | null;

    // object
    properties?: SchemaField[] | null;

    // array
    items?: SchemaNodeSpec | null;
    minItems?: number | null;
    uniqueItems?: boolean | null;
}

export interface SchemaField extends SchemaNodeSpec {
    name: string;
}

export interface SchemaBuilderSave {
    docSchema: any;
    validationAction: ValidationAction;
}

@Component({
    selector: 'app-document-schema-builder',
    templateUrl: './document-schema-builder.component.html',
    styleUrls: ['./document-schema-builder.component.scss']
})
export class DocumentSchemaBuilderComponent implements OnChanges {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    /**
     * Existing docSchema object (the inner schema; NOT wrapped in {docSchema:...} options).
     * Expected shape like:
     * { type:"object", properties:{ ... }, additionalProperties:true }
     */
    @Input() initialDocSchema: any | null = null;

    /**
     * Existing validation action ("off"|"warn"|"strict") if any.
     */
    @Input() initialValidationAction: ValidationAction | string | null = 'off';

    /**
     * Emit when user clicks "Save".
     */
    @Output() save = new EventEmitter<SchemaBuilderSave>();


    // UI state
    activeTab: 'builder' | 'json' = 'builder';
    parseError: string | null = null;

    // root controls
    additionalProperties = true;
    validationAction: ValidationAction = 'off';

    // builder model (root properties)
    fields: SchemaField[] = [];

    // JSON import/export
    jsonText = '';


    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.initFromInputs();
        }
    }


    // Modal visibility

    setVisible(v: boolean) {
        this.visible = v;
        this.visibleChange.emit(v);
        if (!v) {
            this.parseError = null;
            this.activeTab = 'builder';
        }
    }

    close() {
        this.setVisible(false);
    }

    // Init / normalize

    private initFromInputs() {
        this.parseError = null;
        this.activeTab = 'builder';

        this.validationAction = this.normalizeValidationAction(this.initialValidationAction);

        if (this.initialDocSchema) {
            try {
                const {ap, fields} = this.docSchemaToBuilder(this.initialDocSchema);
                this.additionalProperties = ap;
                this.fields = fields;
            } catch (e: any) {
                // If parsing fails, fall back to JSON tab with raw input
                this.additionalProperties = true;
                this.fields = [];
                this.activeTab = 'json';
                this.parseError = e?.message ?? String(e);
            }
        } else {
            this.additionalProperties = true;
            this.fields = [];
        }

        this.jsonText = JSON.stringify(this.buildDocSchema(), null, 2);
    }

    private normalizeValidationAction(v: any): ValidationAction {
        const s = (v ?? 'off').toString().trim().toLowerCase();
        if (s === 'strict') {
            return 'strict';
        }
        if (s === 'warn' || s === 'warning') {
            return 'warn';
        }
        return 'off';
    }


    // Builder operations

    addTopLevelField() {
        this.fields.push(this.newScalarField());
        this.onBuilderChange();
    }

    addChildField(parent: SchemaField) {
        if (parent.kind !== 'object') {
            return;
        }
        if (!parent.properties) {
            parent.properties = [];
        }
        parent.properties.push(this.newScalarField());
        this.onBuilderChange();
    }

    /**
     * Same as addChildField, but works for non-named object nodes (e.g., array items).
     */
    addChildToNode(node: SchemaNodeSpec) {
        if (!node || node.kind !== 'object') {
            return;
        }
        if (!node.properties) {
            node.properties = [];
        }
        node.properties.push(this.newScalarField());
        this.onBuilderChange();
    }

    removeField(parentList: SchemaField[], idx: number) {
        parentList.splice(idx, 1);
        this.onBuilderChange();
    }

    setKind(node: SchemaNodeSpec, kind: NodeKind) {
        node.kind = kind;

        // reset node-specific parts
        node.scalarType = undefined;
        node.minLength = node.maxLength = null;
        node.pattern = null;
        node.minimum = node.exclusiveMinimum = node.maximum = node.exclusiveMaximum = null;
        node.properties = null;
        node.items = null;
        node.minItems = null;
        node.uniqueItems = null;

        if (kind === 'scalar') {
            node.scalarType = 'text';
        } else if (kind === 'object') {
            node.properties = [];
        } else if (kind === 'array') {
            node.items = this.newScalarNode();
        }

        this.onBuilderChange();
    }

    setScalarType(node: SchemaNodeSpec, scalarType: string) {
        node.scalarType = scalarType;
        // clear constraints that don't apply
        if (!this.isStringType(scalarType)) {
            node.minLength = node.maxLength = null;
            node.pattern = null;
        }
        if (!this.isNumberType(scalarType)) {
            node.minimum = node.exclusiveMinimum = node.maximum = node.exclusiveMaximum = null;
        }
        this.onBuilderChange();
    }

    private newScalarNode(): SchemaNodeSpec {
        return {
            kind: 'scalar',
            scalarType: 'text',
            minLength: null,
            maxLength: null,
            pattern: null,
            minimum: null,
            exclusiveMinimum: null,
            maximum: null,
            exclusiveMaximum: null
        };
    }

    private newScalarField(): SchemaField {
        return {
            name: '',
            ...this.newScalarNode()
        };
    }


    // JSON tab operations

    switchTab(tab: 'builder' | 'json') {
        this.activeTab = tab;
        this.parseError = null;

        if (tab === 'json') {
            this.jsonText = JSON.stringify(this.buildDocSchema(), null, 2);
        }
    }

    formatJson() {
        try {
            const obj = JSON.parse(this.jsonText);
            this.jsonText = JSON.stringify(obj, null, 2);
            this.parseError = null;
        } catch (e: any) {
            this.parseError = e?.message ?? 'Invalid JSON';
        }
    }

    importJsonToBuilder() {
        try {
            const obj = JSON.parse(this.jsonText);
            const {ap, fields} = this.docSchemaToBuilder(obj);
            this.additionalProperties = ap;
            this.fields = fields;
            this.parseError = null;
            this.activeTab = 'builder';
        } catch (e: any) {
            this.parseError = e?.message ?? 'Invalid schema JSON';
        }
    }

    // Save

    saveSchema() {
        const validationError = this.validateBuilder();
        if (validationError) {
            this.parseError = validationError;
            this.activeTab = 'builder';
            return;
        }

        const docSchema = this.buildDocSchema();
        this.save.emit({
            docSchema,
            validationAction: this.validationAction
        });

        this.close();
    }

    // Validation

    private validateBuilder(): string | null {
        // Ensure field names are non-empty and unique within each object level
        const visit = (fields: SchemaField[], path: string): string | null => {
            const names = new Set<string>();
            for (const f of fields) {
                const n = (f.name ?? '').trim();
                if (!n) {
                    return `A field name is missing at ${path}.`;
                }
                if (names.has(n)) {
                    return `Duplicate field name "${n}" at ${path}.`;
                }
                names.add(n);

                if (f.kind === 'object' && f.properties) {
                    const err = visit(f.properties, `${path}.${n}`);
                    if (err) {
                        return err;
                    }
                }
                if (f.kind === 'array' && f.items) {
                    const err = visitArrayItems(f.items, `${path}.${n}[]`);
                    if (err) {
                        return err;
                    }
                }
            }
            return null;
        };

        const visitArrayItems = (node: SchemaNodeSpec, path: string): string | null => {
            if (node.kind === 'object' && node.properties) {
                return visit(node.properties, path);
            }
            if (node.kind === 'array' && node.items) {
                return visitArrayItems(node.items, path + '[]');
            }
            return null;
        };

        return visit(this.fields, '$');
    }


    // Build docSchema JSON

    buildDocSchema(): any {
        const props: any = {};
        for (const f of this.fields) {
            props[(f.name ?? '').trim()] = this.nodeToSchema(f);
        }
        return {
            type: 'object',
            properties: props,
            additionalProperties: this.additionalProperties
        };
    }

    private nodeToSchema(node: SchemaNodeSpec): any {
        if (node.kind === 'object') {
            const props: any = {};
            (node.properties ?? []).forEach(child => {
                props[(child.name ?? '').trim()] = this.nodeToSchema(child);
            });
            return {
                type: 'object',
                properties: props
            };
        }

        if (node.kind === 'array') {
            const out: any = {
                type: 'array',
                items: node.items ? this.nodeToSchema(node.items) : {type: 'text'}
            };
            if (node.minItems != null && node.minItems !== undefined) {
                out.minItems = Number(node.minItems);
            }
            if (node.uniqueItems != null && node.uniqueItems !== undefined) {
                out.uniqueItems = !!node.uniqueItems;
            }
            return out;
        }

        // scalar
        const out: any = {
            type: (node.scalarType ?? 'text')
        };

        if (this.isStringType(node.scalarType)) {
            if (node.minLength != null && node.minLength !== undefined) {
                out.minLength = Number(node.minLength);
            }
            if (node.maxLength != null && node.maxLength !== undefined) {
                out.maxLength = Number(node.maxLength);
            }
            if (node.pattern) {
                out.pattern = node.pattern;
            }
        }

        if (this.isNumberType(node.scalarType)) {
            const addNum = (key: string, v: any) => {
                if (v === null || v === undefined || v === '') {
                    return;
                }
                const num = Number(v);
                if (!Number.isNaN(num)) {
                    out[key] = num;
                }
            };
            addNum('minimum', node.minimum);
            addNum('exclusiveMinimum', node.exclusiveMinimum);
            addNum('maximum', node.maximum);
            addNum('exclusiveMaximum', node.exclusiveMaximum);
        }

        return out;
    }


    // Parse docSchema JSON into builder model

    private docSchemaToBuilder(docSchema: any): { ap: boolean, fields: SchemaField[] } {
        if (!docSchema || typeof docSchema !== 'object') {
            throw new Error('docSchema must be an object.');
        }
        const ap = !!docSchema.additionalProperties;
        const props = docSchema.properties;
        if (!props || typeof props !== 'object') {
            throw new Error('docSchema.properties must be an object.');
        }

        const fields: SchemaField[] = Object.keys(props).map(name => {
            const spec = props[name];
            const node = this.schemaToNodeSpec(spec);
            return {
                name,
                ...node
            };
        });

        return {ap, fields};
    }

    private schemaToNodeSpec(spec: any): SchemaNodeSpec {
        if (spec == null) {
            return this.newScalarNode();
        }

        // string shorthand
        if (typeof spec === 'string') {
            return {
                ...this.newScalarNode(),
                scalarType: spec
            };
        }

        if (typeof spec !== 'object') {
            return this.newScalarNode();
        }

        // object node: if it has properties (type may be omitted)
        if (spec.type === 'object' || spec.properties) {
            const props = spec.properties ?? {};
            const children: SchemaField[] = Object.keys(props).map((k) => {
                const childSpec = props[k];
                return {
                    name: k,
                    ...this.schemaToNodeSpec(childSpec)
                };
            });
            return {
                kind: 'object',
                properties: children
            };
        }

        // array node: if it has items (type may be omitted in canonical output)
        if (spec.type === 'array' || spec.items) {
            const items = spec.items ? this.schemaToNodeSpec(spec.items) : this.newScalarNode();
            return {
                kind: 'array',
                items,
                minItems: spec.minItems ?? null,
                uniqueItems: spec.uniqueItems ?? null
            };
        }

        // scalar object with type
        const t = (spec.type ?? 'text').toString();
        const node: SchemaNodeSpec = {
            kind: 'scalar',
            scalarType: t,
            minLength: spec.minLength ?? null,
            maxLength: spec.maxLength ?? null,
            pattern: spec.pattern ?? null,
            minimum: spec.minimum ?? null,
            exclusiveMinimum: spec.exclusiveMinimum ?? null,
            maximum: spec.maximum ?? null,
            exclusiveMaximum: spec.exclusiveMaximum ?? null
        };
        return node;
    }


    // helpers

    isStringType(t: any): boolean {
        const s = (t ?? '').toString().toLowerCase();
        return s === 'string' || s === 'text';
    }

    isNumberType(t: any): boolean {
        const s = (t ?? '').toString().toLowerCase();
        return s === 'number' || s === 'integer' || s === 'int' || s === 'decimal' || s === 'double' || s === 'float';
    }

    onBuilderChange() {
        if (this.activeTab === 'json') {
            this.jsonText = JSON.stringify(this.buildDocSchema(), null, 2);
        }
    }
}