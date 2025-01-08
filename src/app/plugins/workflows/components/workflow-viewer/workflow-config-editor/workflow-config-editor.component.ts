import {Component, computed, effect, EventEmitter, input, OnInit, Output, Signal, signal} from '@angular/core';
import {WorkflowConfigModel} from '../../../models/workflows.model';
import {CatalogService} from '../../../../../services/catalog.service';
import {AdapterModel} from '../../../../../views/adapters/adapter.model';

@Component({
    selector: 'app-workflow-config-editor',
    templateUrl: './workflow-config-editor.component.html',
    styleUrl: './workflow-config-editor.component.scss'
})
export class WorkflowConfigEditorComponent implements OnInit {
    config = input.required<WorkflowConfigModel>();
    isEditable = input.required<boolean>();
    @Output() save = new EventEmitter<WorkflowConfigModel>();

    readonly adapters: Signal<AdapterModel[]>;
    readonly serializedConfig = computed(() => JSON.stringify(this.config()),
        {equal: () => false}); // enforce change when switching to different activity, even if it has the same config value
    readonly editableConfig = computed<WorkflowConfigModel>(() => JSON.parse(this.serializedConfig())); // we edit a copy of the actual config
    readonly serializedEditedConfig = signal<string>(null);
    hasConfigChanged: Signal<boolean>;
    readonly showModal = signal(false);

    constructor(private _catalog: CatalogService) {
        this.adapters = computed(() => {
            this._catalog.listener();
            return [...this._catalog.getStores().filter(store =>
                // mvcc currently results in deadlocks with concurrent schema changes
                store.adapterName !== 'HSQLDB' || store.settings['trxControlMode'] !== 'mvcc'
            )];
        });

        effect(() => this.serializedEditedConfig.set(this.serializedConfig()), {allowSignalWrites: true});
    }

    ngOnInit(): void {
        this.hasConfigChanged = computed(() => this.serializedConfig() !== this.serializedEditedConfig());
    }

    saveConfig() {
        const config = this.editableConfig();
        if (config.maxWorkers < 1) {

        }
        this.save.emit(this.editableConfig());
        this.showModal.set(false);
    }

    toggleModal() {
        this.showModal.update(b => !b);
    }

    show() {
        this.resetEditableConfig(); // reset unsaved changes
        this.showModal.set(true);
    }

    resetEditableConfig() {
        Object.assign(this.editableConfig(), JSON.parse(this.serializedConfig()));
        this.checkForChanges();
    }

    checkForChanges() {
        this.serializedEditedConfig.set(JSON.stringify(this.editableConfig()));
    }
}
