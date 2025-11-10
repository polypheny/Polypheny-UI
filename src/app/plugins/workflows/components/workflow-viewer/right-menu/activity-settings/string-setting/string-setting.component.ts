import {AfterViewInit, Component, computed, effect, EventEmitter, input, model, OnInit, Output, signal, Signal, ViewChild} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {envVarsKey, TypePreviewModel, Variables, wfVarsKey} from '../../../../../models/workflows.model';
import {DataModel} from '../../../../../../../models/ui-request.model';
import {AdapterModel} from '../../../../../../../views/adapters/adapter.model';
import {CatalogService} from '../../../../../../../services/catalog.service';
import {EditorComponent} from '../../../../../../../components/editor/editor.component';
import {WorkflowsService} from '../../../../../services/workflows.service';
import {getSuggestions} from '../../../workflow';

@Component({
    selector: 'app-string-setting',
    templateUrl: './string-setting.component.html',
    styleUrl: './string-setting.component.scss'
})
export class StringSettingComponent implements OnInit, AfterViewInit {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    activityVars = input.required<Variables>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<StringSettingDef>(() => this.settingDef() as StringSettingDef);
    usesAutocomplete = computed(() => this.def().autoComplete !== 'NONE');
    targetPreview = computed(() => this.inTypePreview()[this.def().autoCompleteInput]);
    suggestions = computed(() => {
        if (this.usesAutocomplete()) {
            switch (this.def().autoComplete) {
                case 'FIELD_NAMES':
                    return getSuggestions(this.targetPreview(), 'props');
                case 'ADAPTERS':
                    return this.adapters().map(a => a.name);
                case 'VARIABLES':
                    return Object.keys(this.activityVars()).filter(key => key !== wfVarsKey && key !== envVarsKey);
                case 'WORKFLOW_NAMES':
                    return this.workflowNames();
            }
        }
        return [];
    });
    adapters: Signal<AdapterModel[]>;
    workflowNames = signal<string[]>([]);
    workflowNamesToId = new Map<string, string>();
    protected readonly DataModel = DataModel;

    readonly editorOptions = {
        minLines: 4,
        maxLines: 20,
        showLineNumbers: false,
        highlightGutterLine: false,
        highlightActiveLine: false,
        fontSize: '0.875rem'
    };
    listenForChanges = true;
    @ViewChild('editor') editor: EditorComponent;

    constructor(private _catalog: CatalogService, private _workflows: WorkflowsService) {
        this.adapters = computed(() => {
            this._catalog.listener();
            return [...this._catalog.getStores()]; // warning, HSQLDB mvcc might result in deadlocks with concurrent schema changes
        });


        effect(() => {
            if (this.def().textEditor) {
                if (this.editor.getCode() !== this.value()) { // triggered if value is changed externally
                    this.listenForChanges = false;
                    this.editor?.setCode(this.value());
                    this.listenForChanges = true;
                }
            }
        });
    }

    ngOnInit(): void {
        this.editorOptions.showLineNumbers = this.def().textEditorLineNumbers;
    }

    ngAfterViewInit(): void {
        if (this.def().textEditor) {
            this.editor.onChange(() => {
                if (this.listenForChanges) {
                    const oldVal = this.value();
                    const newVal = this.editor.getCode();
                    if (oldVal !== newVal) {
                        this.value.set(newVal);
                        this.valueChanged();
                    }
                }
            });
        }
        if (this.def().autoComplete === 'WORKFLOW_NAMES') {
            this._workflows.getWorkflowDefs().subscribe(defs => {
                const names = Object.values(defs).map(def => def.name);
                names.sort((a, b) => a.localeCompare(b));
                this.workflowNames.set(names);
                this.workflowNamesToId.clear();
                Object.entries(defs).forEach(([key, def]) => this.workflowNamesToId.set(def.name, key));
            });
        }
    }

    valueChanged() {
        // short delay to ensure this.value() has updated when selecting an autocomplete entry
        setTimeout(() => this.hasChanged.emit(), 1);
    }
}

type AutoCompleteType = 'NONE' | 'FIELD_NAMES' | 'VALUES' | 'ADAPTERS' | 'VARIABLES' | 'WORKFLOW_NAMES';

interface StringSettingDef extends SettingDefModel {
    minLength: number;
    maxLength: number;
    autoComplete: AutoCompleteType;
    autoCompleteInput: number;
    nonBlank: boolean;
    containsRegex: boolean;
    textEditor: boolean;
    textEditorLanguage: string;
    textEditorLineNumbers: boolean;
}
