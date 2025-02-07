import {Component, computed, EventEmitter, inject, input, model, OnInit, Output, signal} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {PolyType} from '../../../../../../../components/data-view/models/result-set.model';
import {DbmsTypesService} from '../../../../../../../services/dbms-types.service';
import {PK_COL, TypePreviewModel} from '../../../../../models/workflows.model';
import {ToasterService} from '../../../../../../../components/toast-exposer/toaster.service';


@Component({
    selector: 'app-cast-setting',
    templateUrl: './cast-setting.component.html',
    styleUrl: './cast-setting.component.scss'
})
export class CastSettingComponent implements OnInit {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    inSuggestions = input.required<string[][]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    casts = computed(() => this.value().casts as SingleCast[]);
    def = computed(() => this.settingDef() as CastSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    fieldType = computed(() => this.targetPreview()?.portType === 'REL' ? 'column' : 'field');
    suggestions = computed(() => this.inSuggestions()[this.def().targetInput]?.filter(v => v !== PK_COL) || []);

    private changed = signal(false); // dummy signal to trigger recomputation
    supportsPrecision = computed(() => {
        this.changed();
        return this.casts().map(c => this._types.supportsPrecision(c.type));
    });
    supportsScale = computed(() => {
        this.changed();
        return this.casts().map(c => this._types.supportsScale(c.type));
    });
    precisionPlaceholder = computed(() => {
        this.changed();
        return this.casts().map(c => this._types.precisionPlaceholder(c.type));
    });

    addName = '';
    addAsJson = false;

    readonly _toast = inject(ToasterService);
    readonly _types = inject(DbmsTypesService);
    types: PolyType[] = [];


    ngOnInit(): void {
        this._types.getTypes().subscribe(
            t => this.types = t
        );
    }

    valueChanged() {
        this.changed.update(v => !v);
        setTimeout(() => {
            this.hasChanged.emit();
        }, 1);
    }

    addCast() {
        if (this.casts().some(c => c.source === this.addName)) {
            this._toast.warn('Cast for this source is already defined');
            this.addName = '';
            return;
        }

        const sourceCol = this.targetPreview()?.columns?.find(col => col.name === this.addName);
        let type = this.def().defaultType;
        let nullable = true;
        let collectionsType = '';
        let dimension = -1;
        let cardinality = -1;
        let precision = null;
        let scale = null;
        if (sourceCol) {
            nullable = !sourceCol.dataType.includes('NOT NULL');

            // matches the first word (e.g. VARCHAR) and optionally precision and scale in parentheses
            const match = sourceCol.dataType.match(/^(\w+)(?:\((\d+)(?:,\s*(\d+))?\))?/);
            if (match) {
                type = match[1];
                if (match[2]) {
                    precision = parseInt(match[2], 10);
                }
                if (match[3]) {
                    scale = parseInt(match[3], 10);
                }
            }

            const collMatch = sourceCol.dataType.match(/ARRAY\((\d+),\s*(\d+)\)/);
            if (collMatch) {
                collectionsType = 'ARRAY';
                cardinality = parseInt(collMatch[1], 10);
                dimension = parseInt(collMatch[2], 10);
            }
        }

        const cast = {
            source: this.addName, target: null,
            type, nullable, collectionsType, precision, scale, dimension, cardinality
        };
        if (this.addAsJson) {
            cast['asJson'] = true;
        }


        this.casts().push(cast);
        this.addName = '';
        this.valueChanged();
    }

    deleteCast(idx: number) {
        this.casts().splice(idx, 1);
        this.valueChanged();
    }
}

interface CastSettingDef extends SettingDefModel {
    targetInput: number;
    defaultType: string;
    allowDuplicateSource: boolean;
    allowTarget: boolean;
    allowJson: boolean;
    singleCast: boolean;
}

interface SingleCast {
    source: string;
    target: string;

    type: string;
    nullable: boolean;
    collectionsType: string;
    precision: number | null;
    scale: number | null;
    dimension: number | null;
    cardinality: number | null;

    asJson?: boolean; // only required if true

}
