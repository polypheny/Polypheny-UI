import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';

type NodeKind = 'scalar' | 'object' | 'array';

type SchemaRow = {
    name: string;
    path: string;
    level: number;
    kind: NodeKind;
    scalarType?: string;
    constraints: string;
    required: boolean; // in current dialect: always true for declared fields
};

@Component({
    selector: 'app-document-schema-overview',
    templateUrl: './document-schema-overview.component.html',
    styleUrls: ['./document-schema-overview.component.scss']
})
export class DocumentSchemaOverviewComponent implements OnChanges {

    @Input() docSchema: any | null = null;
    @Input() validationAction: string = 'off';

    additionalProperties = true;
    rows: SchemaRow[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        this.rebuild();
    }

    private rebuild() {
        this.rows = [];

        if (!this.docSchema || typeof this.docSchema !== 'object') {
            return;
        }

        this.additionalProperties = !!this.docSchema.additionalProperties;

        const props = this.docSchema.properties;
        if (!props || typeof props !== 'object') {
            return;
        }

        this.visitProperties(props, '$', 0);
    }

    private visitProperties(props: any, basePath: string, level: number) {
        for (const key of Object.keys(props)) {
            const spec = props[key];
            this.visitNode(key, spec, `${basePath}.${key}`, level);
        }
    }

    private visitNode(name: string, spec: any, path: string, level: number) {
        const kind = this.kindOf(spec);

        if (kind === 'object') {
            this.rows.push({
                name,
                path,
                level,
                kind,
                constraints: this.formatObjectConstraints(spec),
                required: true
            });

            const childProps = (spec && typeof spec === 'object') ? (spec.properties ?? null) : null;
            if (childProps && typeof childProps === 'object') {
                this.visitProperties(childProps, path, level + 1);
            }
            return;
        }

        if (kind === 'array') {
            this.rows.push({
                name,
                path,
                level,
                kind,
                constraints: this.formatArrayConstraints(spec),
                required: true
            });

            // synthetic "items" row
            const itemsSpec = (spec && typeof spec === 'object') ? spec.items : null;
            const itemsKind = this.kindOf(itemsSpec);
            const itemsPath = `${path}[]`;

            this.rows.push({
                name: 'items',
                path: itemsPath,
                level: level + 1,
                kind: itemsKind,
                scalarType: itemsKind === 'scalar' ? this.scalarTypeOf(itemsSpec) : undefined,
                constraints: this.formatConstraints(itemsSpec),
                required: true
            });

            // recurse into items
            if (itemsKind === 'object' && itemsSpec?.properties) {
                this.visitProperties(itemsSpec.properties, itemsPath, level + 2);
            } else if (itemsKind === 'array') {
                // nested arrays: recurse again
                this.visitNode('items', itemsSpec, itemsPath, level + 2);
            }

            return;
        }

        // scalar
        const scalarType = this.scalarTypeOf(spec);
        this.rows.push({
            name,
            path,
            level,
            kind: 'scalar',
            scalarType,
            constraints: this.formatScalarConstraints(spec, scalarType),
            required: true
        });
    }

    private kindOf(spec: any): NodeKind {
        if (spec == null) return 'scalar';
        if (typeof spec === 'string') return 'scalar';
        if (typeof spec !== 'object') return 'scalar';
        if (spec.type === 'object' || spec.properties) return 'object';
        if (spec.type === 'array' || spec.items) return 'array';
        return 'scalar';
    }

    private scalarTypeOf(spec: any): string {
        if (typeof spec === 'string') return spec;
        if (spec && typeof spec === 'object' && spec.type) return String(spec.type);
        return 'text';
    }

    private formatConstraints(spec: any): string {
        const k = this.kindOf(spec);
        if (k === 'scalar') return this.formatScalarConstraints(spec, this.scalarTypeOf(spec));
        if (k === 'array') return this.formatArrayConstraints(spec);
        return this.formatObjectConstraints(spec);
    }

    private formatObjectConstraints(spec: any): string {
        const count = (spec?.properties && typeof spec.properties === 'object')
            ? Object.keys(spec.properties).length
            : 0;
        return count > 0 ? `${count} properties` : '—';
    }

    private formatArrayConstraints(spec: any): string {
        if (!spec || typeof spec !== 'object') return '—';
        const parts: string[] = [];
        if (spec.minItems !== undefined && spec.minItems !== null) parts.push(`minItems=${spec.minItems}`);
        if (spec.uniqueItems !== undefined && spec.uniqueItems !== null) parts.push(`uniqueItems=${!!spec.uniqueItems}`);
        return parts.length ? parts.join(', ') : '—';
    }

    private formatScalarConstraints(spec: any, t: string): string {
        if (typeof spec === 'string' || spec == null || typeof spec !== 'object') return '—';

        const parts: string[] = [];
        const ts = (t ?? '').toLowerCase();

        const isString = ts === 'text' || ts === 'string';
        const isNumber = ts === 'number' || ts === 'integer' || ts === 'int' || ts === 'decimal' || ts === 'double' || ts === 'float';

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
}