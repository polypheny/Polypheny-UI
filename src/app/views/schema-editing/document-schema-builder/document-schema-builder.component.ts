import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';

export type ValidationAction = 'off' | 'warn' | 'strict';

// NOTE: "kind" remains an internal implementation detail, but the UI no longer exposes it.
export type NodeKind = 'scalar' | 'object' | 'array' | 'oneOf';

/**
 * Node specification used by the UI builder (independent of the backend JSON shape).
 *
 * Supported backend features covered by this UI:
 * - Scalars with union types: type: "text" OR type: ["text","null"]
 * - Object/Array
 * - oneOf
 * - required (per object)
 * - additionalProperties (per object, boolean)
 */
export interface SchemaNodeSpec {
    kind: NodeKind;

    // object-only
    /** additionalProperties for THIS object (boolean). */
    additionalProperties?: boolean | null;

    // scalar-only
    /** Allowed scalar types (union). Non-empty when kind==='scalar'. */
    scalarTypes?: string[];

    minLength?: number | null;
    maxLength?: number | null;
    pattern?: string | null;

    minimum?: number | null;
    maximum?: number | null;

    // object
    properties?: SchemaField[] | null;

    // array
    items?: SchemaNodeSpec | null;
    minItems?: number | null;
    uniqueItems?: boolean | null;

    // composition
    oneOf?: SchemaNodeSpec[] | null;
}

export interface SchemaField extends SchemaNodeSpec {
    name: string;
    /** Whether this field is required in its parent object. */
    required?: boolean;
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

    /**
     * If true, render the builder inline (no modal overlay). This is used on the schema page where
     * the field list "transforms" into the editor.
     */
    @Input() embedded = false;

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    /** Existing docSchema object (the inner schema; NOT wrapped in {docSchema:...} options). */
    @Input() initialDocSchema: any | null = null;

    /** Existing validation action ("off"|"warn"|"strict") if any. */
    @Input() initialValidationAction: ValidationAction | string | null = 'off';

    /** Emit when user clicks "Save". */
    @Output() save = new EventEmitter<SchemaBuilderSave>();

    /** Emit when user cancels editing (only relevant for embedded mode). */
    @Output() cancel = new EventEmitter<void>();


    // UI state
    activeTab: 'builder' | 'json' = 'builder';
    parseError: string | null = null;

    // root object controls
    rootAdditionalProperties = true;
    validationAction: ValidationAction = 'off';

    // builder model (root properties)
    fields: SchemaField[] = [];

    // JSON import/export
    jsonText = '';


    // Tree folding state (UI only)
    private uiIdCounter = 0;
    private expanded: Record<string, boolean> = {};



    ngOnChanges(changes: SimpleChanges): void {
        // Modal mode: initialize when it becomes visible
        if (!this.embedded) {
            if (changes['visible'] && this.visible) {
                this.initFromInputs();
            }
            return;
        }

        // Embedded mode: initialize whenever inputs change (and on first render)
        if (changes['initialDocSchema'] || changes['initialValidationAction'] || changes['embedded']) {
            this.initFromInputs();
        }
    }


    // Modal visibility

    setVisible(v: boolean) {
        if (this.embedded) {
            // In embedded mode we don't control visibility via a modal.
            return;
        }
        this.visible = v;
        this.visibleChange.emit(v);
        if (!v) {
            this.parseError = null;
            this.activeTab = 'builder';
        }
    }

    close() {
        if (this.embedded) {
            this.cancel.emit();
            return;
        }
        this.setVisible(false);
    }


    // Init / normalize

    private initFromInputs() {
        this.parseError = null;
        this.activeTab = 'builder';

        // Reset folding state on every new input init
        this.uiIdCounter = 0;
        this.expanded = {};

        this.validationAction = this.normalizeValidationAction(this.initialValidationAction);

        if (this.initialDocSchema) {
            try {
                const {ap, fields} = this.docSchemaToBuilder(this.initialDocSchema);
                this.rootAdditionalProperties = ap;
                this.fields = fields;
            } catch (e: any) {
                // If parsing fails, fall back to JSON tab with raw input
                this.rootAdditionalProperties = true;
                this.fields = [];
                this.activeTab = 'json';
                this.parseError = e?.message ?? String(e);
            }
        } else {
            this.rootAdditionalProperties = true;
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
        const field = this.newScalarField();
        this.fields.push(field);
        this.expanded[this.uiId(field)] = true;
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
        this.expanded[this.uiId(parent)] = true;
        this.onBuilderChange();
    }

    /** Same as addChildField, but works for non-named object nodes (e.g., array items). */
    addChildToNode(node: SchemaNodeSpec) {
        if (!node || node.kind !== 'object') {
            return;
        }
        if (!node.properties) {
            node.properties = [];
        }
        node.properties.push(this.newScalarField());
        this.expanded[this.uiId(node)] = true;
        this.onBuilderChange();
    }

    removeField(parentList: SchemaField[], idx: number) {
        parentList.splice(idx, 1);
        this.onBuilderChange();
    }


    // Fold / unfold helpers (UI-only)

    private uiId(node: any): string {
        if (!node || typeof node !== 'object') {
            return '';
        }
        const n: any = node as any;
        if (!n._uiId) {
            this.uiIdCounter += 1;
            n._uiId = `n${this.uiIdCounter}`;
        }
        return n._uiId;
    }

    isExpanded(node: any): boolean {
        const id = this.uiId(node);
        if (!id) {
            return true;
        }
        return this.expanded[id] !== false;
    }

    toggleExpanded(node: any) {
        const id = this.uiId(node);
        if (!id) {
            return;
        }
        this.expanded[id] = !(this.expanded[id] !== false);
    }

    isCollapsible(node: any): boolean {
        if (!node) {
            return false;
        }
        if (node.kind === 'object') {
            return (node.properties?.length ?? 0) > 0;
        }
        if (node.kind === 'array') {
            return !!node.items;
        }
        if (node.kind === 'oneOf') {
            return (node.oneOf?.length ?? 0) > 0;
        }
        return false;
    }

    expandAll() {
        this.walkAllNodes((n: any) => {
            if (this.isCollapsible(n)) {
                this.expanded[this.uiId(n)] = true;
            }
        });
    }

    collapseAll() {
        this.walkAllNodes((n: any) => {
            if (this.isCollapsible(n)) {
                this.expanded[this.uiId(n)] = false;
            }
        });
    }

    private walkAllNodes(fn: (n: any) => void) {
        const visit = (node: any) => {
            if (!node || typeof node !== 'object') {
                return;
            }

            fn(node);

            if (node.kind === 'object' && Array.isArray(node.properties)) {
                for (const c of node.properties) {
                    visit(c);
                }
            } else if (node.kind === 'array' && node.items) {
                visit(node.items);
            } else if (node.kind === 'oneOf' && Array.isArray(node.oneOf)) {
                for (const opt of node.oneOf) {
                    visit(opt);
                }
            }
        };

        for (const f of this.fields) {
            visit(f);
        }
    }


    // === Type selection (replaces explicit "Kind" in the UI) ===

    /** Returns the currently selected value for the single "Type" dropdown. */
    typeSelectValue(node: SchemaNodeSpec): string {
        if (!node) {
            return 'text';
        }
        if (node.kind === 'object') {
            return 'object';
        }
        if (node.kind === 'array') {
            return 'array';
        }
        if (node.kind === 'oneOf') {
            return 'oneOf';
        }
        const types = this.getScalarTypes(node);
        return ((types[0] ?? 'text') === 'string' ? 'text' : (types[0] ?? 'text'));
    }

    /** Apply a value from the "Type" dropdown onto the node. */
    setTypeFromSelect(node: SchemaNodeSpec, value: string) {
        const v = (value ?? '').toString();

        if (v === 'object') {
            this.setKind(node, 'object');
            return;
        }
        if (v === 'array') {
            this.setKind(node, 'array');
            return;
        }
        if (v === 'oneOf') {
            this.setKind(node, 'oneOf');
            return;
        }

        // scalar
        if (node.kind !== 'scalar') {
            this.setKind(node, 'scalar');
        }
        this.setScalarPrimaryType(node, v);
    }


    isKind(node: SchemaNodeSpec, kind: NodeKind): boolean {
        return !!node && node.kind === kind;
    }

    toggleKindCheckbox(node: SchemaNodeSpec, kind: NodeKind, checked: boolean) {
        if (checked) {
            if (node.kind !== kind) {
                this.setKind(node, kind);
            }
            return;
        }

        // Keep at least one concrete type selected. Falling back to scalar/text
        // makes checkbox-only selection predictable.
        if (node.kind === kind) {
            this.setKind(node, 'scalar');
        }
    }

    toggleTypeCheckbox(node: SchemaNodeSpec, type: string, checked: boolean) {
        const normalized = (type ?? 'text').toString().toLowerCase();

        if (node.kind !== 'scalar') {
            if (!checked) {
                return;
            }
            this.setKind(node, 'scalar');
            node.scalarTypes = [normalized];
            this.onBuilderChange();
            return;
        }

        this.toggleScalarType(node, normalized, checked);
    }


    // Kind reset (internal)

    private setKind(node: SchemaNodeSpec, kind: NodeKind) {
        node.kind = kind;

        // reset node-specific parts
        node.scalarTypes = undefined;
        node.minLength = node.maxLength = null;
        node.pattern = null;
        node.minimum = node.maximum = null;

        node.properties = null;
        node.additionalProperties = null;

        node.items = null;
        node.minItems = null;
        node.uniqueItems = null;

        node.oneOf = null;

        if (kind === 'scalar') {
            node.scalarTypes = ['text'];
        } else if (kind === 'object') {
            node.additionalProperties = true;
            node.properties = [];
        } else if (kind === 'array') {
            node.items = this.newScalarNode();
        } else if (kind === 'oneOf') {
            node.oneOf = [this.newScalarNode(), this.newScalarNode()];
        }

        this.expanded[this.uiId(node)] = true;

        this.onBuilderChange();
    }


    // Scalar union types (OR)

    getScalarTypes(node: SchemaNodeSpec): string[] {
        const t = (node?.scalarTypes ?? []).filter(x => !!x);
        return t.length ? t : ['text'];
    }

    hasScalarType(node: SchemaNodeSpec, t: string): boolean {
        const types = this.getScalarTypes(node).map(x => x.toLowerCase());
        return types.includes((t ?? '').toLowerCase());
    }

    /** Sets the first/primary scalar type. If the type already exists in the union, it is moved to the front. */
    private setScalarPrimaryType(node: SchemaNodeSpec, scalarType: string) {
        const normalized = (scalarType ?? 'text').toString();
        const types = this.getScalarTypes(node);

        const idx = types.findIndex(x => x.toLowerCase() === normalized.toLowerCase());
        let next: string[];
        if (idx >= 0) {
            next = [types[idx], ...types.filter((_, i) => i !== idx)];
        } else {
            // Switch to a single type (keeps the UI predictable)
            next = [normalized];
        }

        node.scalarTypes = next;

        // Clear constraints that cannot apply anymore
        if (!this.isStringAllowed(node)) {
            node.minLength = node.maxLength = null;
            node.pattern = null;
        }
        if (!this.isNumberAllowed(node)) {
            node.minimum = node.maximum = null;
        }

        this.onBuilderChange();
    }

    toggleScalarType(node: SchemaNodeSpec, scalarType: string, enabled: boolean) {
        if (node.kind !== 'scalar') {
            // Only relevant for scalar nodes
            return;
        }

        const t = (scalarType ?? '').toString();
        let types = this.getScalarTypes(node);

        const has = types.some(x => x.toLowerCase() === t.toLowerCase());

        if (enabled && !has) {
            types = [...types, t];
        }

        if (!enabled && has) {
            const filtered = types.filter(x => x.toLowerCase() !== t.toLowerCase());
            // must keep at least one
            types = filtered.length ? filtered : types;
        }

        // ensure primary still exists
        if (types.length > 0) {
            node.scalarTypes = types;
        }

        if (!this.isStringAllowed(node)) {
            node.minLength = node.maxLength = null;
            node.pattern = null;
        }
        if (!this.isNumberAllowed(node)) {
            node.minimum = node.maximum = null;
        }

        this.onBuilderChange();
    }


    // oneOf operations

    addOneOfOption(node: SchemaNodeSpec) {
        if (node.kind !== 'oneOf') {
            return;
        }
        if (!node.oneOf) {
            node.oneOf = [];
        }
        node.oneOf.push(this.newScalarNode());
        this.expanded[this.uiId(node)] = true;
        this.onBuilderChange();
    }

    removeOneOfOption(node: SchemaNodeSpec, idx: number) {
        if (node.kind !== 'oneOf' || !node.oneOf) {
            return;
        }
        node.oneOf.splice(idx, 1);
        this.onBuilderChange();
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
            this.rootAdditionalProperties = ap;
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

        const visitFields = (fields: SchemaField[], path: string): string | null => {
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

                const err = visitNode(f, `${path}.${n}`);
                if (err) {
                    return err;
                }
            }
            return null;
        };

        const visitNode = (node: SchemaNodeSpec, path: string): string | null => {
            if (!node) {
                return null;
            }

            if (node.kind === 'object' && node.properties) {
                return visitFields(node.properties, path);
            }

            if (node.kind === 'array' && node.items) {
                return visitNode(node.items, path + '[]');
            }

            if (node.kind === 'oneOf' && node.oneOf) {
                for (let i = 0; i < node.oneOf.length; i++) {
                    const err = visitNode(node.oneOf[i], `${path}.oneOf[${i + 1}]`);
                    if (err) {
                        return err;
                    }
                }
            }

            return null;
        };

        return visitFields(this.fields, '$');
    }


    // Build docSchema JSON

    buildDocSchema(): any {
        const props: any = {};
        for (const f of this.fields) {
            props[(f.name ?? '').trim()] = this.nodeToSchema(f);
        }

        const required = this.fields
        .filter(f => (f.required ?? true) && (f.name ?? '').trim().length > 0)
        .map(f => (f.name ?? '').trim());

        return {
            type: 'object',
            properties: props,
            required,
            additionalProperties: !!this.rootAdditionalProperties
        };
    }

    private nodeToSchema(node: SchemaNodeSpec): any {
        if (node.kind === 'object') {
            const props: any = {};
            const required: string[] = [];

            (node.properties ?? []).forEach(child => {
                const n = (child.name ?? '').trim();
                if (!n) {
                    return;
                }
                props[n] = this.nodeToSchema(child);
                if (child.required ?? true) {
                    required.push(n);
                }
            });

            return {
                type: 'object',
                properties: props,
                required,
                additionalProperties: node.additionalProperties !== undefined && node.additionalProperties !== null
                    ? !!node.additionalProperties
                    : true
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

        if (node.kind === 'oneOf') {
            return {
                oneOf: (node.oneOf ?? []).map(x => this.nodeToSchema(x))
            };
        }

        // scalar
        const types = this.getScalarTypes(node);
        const out: any = {
            type: types.length === 1 ? types[0] : types
        };

        if (this.isStringAllowed(node)) {
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

        if (this.isNumberAllowed(node)) {
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
            addNum('maximum', node.maximum);
        }

        return out;
    }


    // Parse docSchema JSON into builder model

    private docSchemaToBuilder(docSchema: any): { ap: boolean, fields: SchemaField[] } {
        if (!docSchema || typeof docSchema !== 'object') {
            throw new Error('docSchema must be an object.');
        }
        const ap = docSchema.additionalProperties !== undefined ? !!docSchema.additionalProperties : true;
        const props = docSchema.properties;
        if (!props || typeof props !== 'object') {
            throw new Error('docSchema.properties must be an object.');
        }

        const rootReq = Array.isArray(docSchema.required)
            ? new Set<string>(docSchema.required.map((x: any) => String(x)))
            : null;

        const fields: SchemaField[] = Object.keys(props).map(name => {
            const spec = props[name];
            const node = this.schemaToNodeSpec(spec);
            return {
                name,
                required: rootReq ? rootReq.has(name) : true,
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
                scalarTypes: [String(spec).toLowerCase() === 'string' ? 'text' : spec]
            };
        }

        if (typeof spec !== 'object') {
            return this.newScalarNode();
        }

        // oneOf
        if (Array.isArray(spec.oneOf)) {
            return {
                kind: 'oneOf',
                oneOf: spec.oneOf.map((x: any) => this.schemaToNodeSpec(x))
            };
        }

        // object node
        if (spec.type === 'object' || spec.properties) {
            const props = spec.properties ?? {};

            const reqSet = Array.isArray(spec.required)
                ? new Set<string>(spec.required.map((x: any) => String(x)))
                : null;

            const children: SchemaField[] = Object.keys(props).map((k) => {
                const childSpec = props[k];
                return {
                    name: k,
                    required: reqSet ? reqSet.has(k) : true,
                    ...this.schemaToNodeSpec(childSpec)
                };
            });

            return {
                kind: 'object',
                additionalProperties: spec.additionalProperties !== undefined ? !!spec.additionalProperties : true,
                properties: children
            };
        }

        // array node
        if (spec.type === 'array' || spec.items) {
            const items = spec.items ? this.schemaToNodeSpec(spec.items) : this.newScalarNode();
            return {
                kind: 'array',
                items,
                minItems: spec.minItems ?? null,
                uniqueItems: spec.uniqueItems ?? null
            };
        }

        // scalar object with type (string OR array)
        const t = spec.type;
        const scalarTypes: string[] = [];
        if (Array.isArray(t)) {
            for (const el of t) {
                if (el != null) {
                    scalarTypes.push(String(el).toLowerCase() === 'string' ? 'text' : String(el));
                }
            }
        } else if (t != null) {
            scalarTypes.push(String(t).toLowerCase() === 'string' ? 'text' : String(t));
        } else {
            scalarTypes.push('text');
        }

        return {
            kind: 'scalar',
            scalarTypes,
            minLength: spec.minLength ?? null,
            maxLength: spec.maxLength ?? null,
            pattern: spec.pattern ?? null,
            minimum: spec.minimum ?? null,
            maximum: spec.maximum ?? null
        };
    }


    // helpers

    isStringAllowed(node: SchemaNodeSpec): boolean {
        const types = this.getScalarTypes(node).map(x => x.toLowerCase());
        return types.includes('string') || types.includes('text');
    }

    isNumberAllowed(node: SchemaNodeSpec): boolean {
        const types = this.getScalarTypes(node).map(x => x.toLowerCase());
        return types.includes('number') || types.includes('integer') || types.includes('int') || types.includes('decimal') || types.includes('double') || types.includes('float');
    }

    // Used by template checkboxes
    scalarTypeOptions(): string[] {
        return ['text', 'number', 'boolean', 'null'];
    }

    onBuilderChange() {
        if (this.activeTab === 'json') {
            this.jsonText = JSON.stringify(this.buildDocSchema(), null, 2);
        }
    }


    // factories

    private newScalarNode(): SchemaNodeSpec {
        return {
            kind: 'scalar',
            scalarTypes: ['text'],
            minLength: null,
            maxLength: null,
            pattern: null,
            minimum: null,
            maximum: null
        };
    }

    private newScalarField(): SchemaField {
        return {
            name: '',
            required: true,
            ...this.newScalarNode()
        };
    }
}
