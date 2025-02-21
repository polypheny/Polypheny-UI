import {Component, computed, effect, EventEmitter, input, model, Output, signal} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {PK_COL, TypePreviewModel} from '../../../../../models/workflows.model';
import {ToasterService} from '../../../../../../../components/toast-exposer/toaster.service';


@Component({
    selector: 'app-graph-map-setting',
    templateUrl: './graph-map-setting.component.html',
    styleUrl: './graph-map-setting.component.scss'
})
export class GraphMapSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    inSuggestions = input.required<string[][]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    protected readonly parseInt = parseInt;

    private changed = signal(false); // dummy signal to trigger recomputation
    mappings = computed(() => this.value().mappings as InputMapping[]); // like value, but with correct type
    def = computed(() => this.settingDef() as GraphMapSettingDef);
    targetPreviews = computed(() => this.inTypePreview().slice(this.def().targetInput));
    suggestions = computed(() => this.inSuggestions().slice(this.def().targetInput).map(s => s.filter(v => v !== PK_COL) || []));
    graphNodeLabels = computed(() => {
        if (!this.def().canExtendGraph || this.def().graphInput < 0) {
            return [];
        }
        return this.inTypePreview()[this.def().graphInput]?.nodeLabels || [];
    });
    nInputs = computed(() => this.suggestions().length);
    remainingInputs = computed<number[]>(() => {
        this.changed();
        const indexes = [];
        for (let i = 0; i < this.nInputs(); i++) {
            if (!this.mappings().some(m => m.inputIdx === i)) {
                indexes.push(i);
            }
        }
        if (this.addIdx === null) {
            this.addIdx = indexes[0];
        }
        return indexes;
    });

    addIdx = null;
    addEdgeOnly = false;

    // https://www.npmjs.com/package/angular2-multiselect-dropdown
    readonly propertiesSettings = {
        singleSelection: false,
        text: 'Add Edge Properties...',
        noDataLabel: 'No fields found',
        searchPlaceholderText: 'Search or add new',
        enableSearchFilter: true,
        enableCheckAll: false,
        enableFilterSelectAll: false,
        addNewItemOnFilter: true,
        tagToBody: false
    };
    fieldsData = computed(() => this.suggestions().map(fields =>
        fields.map(field => ({id: field, itemName: field}))
    ));
    propertiesData: Map<string, { id: string; itemName: string; }[]> = new Map(); // required since multiselect expects specific structure of items

    constructor(private _toast: ToasterService) {
        effect(() => {
            this.changed();
            for (const mapping of this.mappings()) {
                if (!mapping.edgeOnly) {
                    for (const [index, edge] of mapping.edges.entries()) {
                        const items = edge.propertyFields.map(field => ({id: field, itemName: field}));
                        this.propertiesData.set(mapping.inputIdx + '_' + index, items);

                    }
                }
            }
        });
    }

    valueChanged() {
        this.changed.update(v => !v);
        setTimeout(() => this.hasChanged.emit(), 1);
    }

    addMapping() {
        const inputIdx = parseInt(String(this.addIdx), 10);
        if (!this.remainingInputs().includes(inputIdx)) {
            console.log(inputIdx, typeof (inputIdx));
            console.log(this.remainingInputs(), typeof (this.remainingInputs()));
            this._toast.warn('A mapping for this input already exists: ' + inputIdx + ', ' + this.remainingInputs());
            return;
        }
        if (this.addEdgeOnly) {
            this.mappings().push({
                edgeOnly: true, inputIdx,
                edge: {
                    dynamicEdgeLabels: false, edgeLabels: ['EDGE'],
                    leftField: '', leftTargetIdx: 0, leftTargetField: '',
                    rightField: '', rightTargetIdx: 0, rightTargetField: '',
                    invertDirection: false,
                }
            });
        } else {
            this.mappings().push({
                edgeOnly: false, inputIdx,
                dynamicNodeLabels: false, nodeLabels: ['Node'], edges: []
            });
        }
        if (this.remainingInputs().length > 1) {
            this.addIdx = this.remainingInputs().find(i => i !== this.addIdx);
        }


        this.valueChanged();
    }

    deleteMapping(idx: number) {
        const removed = this.mappings().splice(idx, 1)[0]; // idx is different to inputIdx
        if (!this.remainingInputs().includes(this.addIdx)) {
            this.addIdx = removed.inputIdx;
        }
        this.valueChanged();
    }

    addEdge(mapping: InputMapping) {
        mapping.edges.push({
            dynamicEdgeLabels: false, edgeLabels: ['EDGE'],
            rightField: '', rightTargetIdx: 0, rightTargetField: '',
            invertDirection: false, propertyFields: []
        });
        this.valueChanged();
    }

    deleteEdge(mapping: InputMapping, idx: number) {
        mapping.edges.splice(idx, 1);
        this.valueChanged();
    }

    addProperty(edge: EdgeMapping, fieldName: string) {
        if (edge.propertyFields.includes(fieldName)) {
            this._toast.warn('Duplicate field names are not permitted');
            return;
        }
        edge.propertyFields.push(fieldName);
        this.valueChanged();
    }

    propertyDataChange(edge: EdgeMapping, event: { id: string; itemName: string; }[]) {
        edge.propertyFields = event.map(e => e.id);
        this.valueChanged();
    }

    getLabel(targetField: string) {
        // string is either label.property or property
        const i = targetField.indexOf('.');
        if (i < 1) {
            return '';
        }
        return targetField.substring(0, i);
    }

    getProperty(targetField: string) {
        const i = targetField.indexOf('.');
        return i !== -1 ? targetField.substring(i + 1) : targetField;
    }

    replaceLabel(targetField: string, label: string) {
        if (label.trim().length === 0) {
            return this.getProperty(targetField);
        }
        return label + '.' + this.getProperty(targetField);
    }

    replaceProperty(targetField: string, property: string) {
        if (targetField.indexOf('.') < 1) {
            return property;
        }
        return this.getLabel(targetField) + '.' + property;
    }

}


interface GraphMapSettingDef extends SettingDefModel {
    canExtendGraph: boolean;
    targetInput: number;
    graphInput: number;
}

interface InputMapping {
    edgeOnly: boolean;
    inputIdx: number;

    // node
    dynamicNodeLabels?: boolean;
    nodeLabels?: string[];
    edges?: EdgeMapping[];

    // edge
    edge?: EdgeMapping;
}

interface EdgeMapping {
    dynamicEdgeLabels: boolean;
    edgeLabels: string[];

    leftField?: string;
    leftTargetIdx?: number;
    leftTargetField?: string;

    rightField: string;
    rightTargetIdx: number;
    rightTargetField: string;

    invertDirection: boolean;
    propertyFields?: string[];
}
