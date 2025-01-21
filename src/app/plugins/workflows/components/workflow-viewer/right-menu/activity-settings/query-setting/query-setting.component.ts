import {AfterViewInit, Component, computed, effect, EventEmitter, input, model, Output, ViewChild} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {EditorComponent} from '../../../../../../../components/editor/editor.component';

@Component({
    selector: 'app-query-setting',
    templateUrl: './query-setting.component.html',
    styleUrl: './query-setting.component.scss'
})
export class QuerySettingComponent implements AfterViewInit {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    @ViewChild('editor') editor: EditorComponent;

    val = computed(() => this.value() as QueryValue); // like value, but with correct type
    def = computed<QuerySettingDef>(() => this.settingDef() as QuerySettingDef);
    listenForChanges = true;

    readonly editorOptions = {
        minLines: 4,
        maxLines: 10,
        showLineNumbers: true,
        highlightGutterLine: false,
        highlightActiveLine: false,
        fontSize: '0.875rem'
    };

    constructor() {
        effect(() => {
            this.val(); // listen for changes in val
            this.listenForChanges = false;
            this.editor?.setCode(this.val().query);
            this.listenForChanges = true;
        });
    }

    ngAfterViewInit(): void {
        this.editor.onChange(value => {
            if (this.listenForChanges) {
                const oldQuery = this.val().query;
                const newQuery = this.editor.getCode();
                console.log('old vs new', oldQuery, newQuery, oldQuery !== newQuery);
                if (oldQuery !== newQuery) {
                    this.val().query = newQuery;
                    this.valueChanged();
                }
            }
        });
    }


    valueChanged() {
        this.hasChanged.emit();
    }

    insertInput(idx: number) {
        this.editor.insertAtCursor(this.def().entityL + idx.toString() + this.def().entityR);
        this.editor.focus();
    }
}

interface QuerySettingDef extends SettingDefModel {
    queryLanguages: string[];
    entityL: string;
    entityR: string;
}

interface QueryValue {
    query: string;
    queryLanguage: string;
}
