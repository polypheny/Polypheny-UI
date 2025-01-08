import {Component, computed, effect, EventEmitter, input, OnInit, Output, Signal, signal} from '@angular/core';
import {ActivityConfigModel, CommonType, ControlStateMerger} from '../../../../models/workflows.model';
import {NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivityDef} from '../../../../models/activity-registry.model';
import {ButtonDirective, FormCheckComponent, FormCheckInputDirective, FormCheckLabelDirective, FormControlDirective, FormDirective, FormLabelDirective, FormSelectDirective, InputGroupComponent, InputGroupTextDirective} from '@coreui/angular';
import {AdapterModel} from '../../../../../../views/adapters/adapter.model';
import {CatalogService} from '../../../../../../services/catalog.service';

@Component({
    selector: 'app-activity-config-editor',
    standalone: true,
    imports: [
        FormsModule,
        NgForOf,
        FormDirective,
        FormLabelDirective,
        FormCheckComponent,
        FormCheckInputDirective,
        FormCheckLabelDirective,
        FormSelectDirective,
        ButtonDirective,
        InputGroupComponent,
        InputGroupTextDirective,
        NgIf,
        FormControlDirective
    ],
    templateUrl: './activity-config-editor.component.html',
    styleUrl: './activity-config-editor.component.scss'
})
export class ActivityConfigEditorComponent implements OnInit {

    config = input.required<ActivityConfigModel>();
    def = input.required<ActivityDef>();
    isEditable = input.required<boolean>();
    @Output() save = new EventEmitter<ActivityConfigModel>();

    readonly commonTypes = Object.values(CommonType);
    readonly controlStateMergers = Object.values(ControlStateMerger);
    readonly adapters: Signal<AdapterModel[]>;
    serializedConfig = computed(() => JSON.stringify(this.config()),
        {equal: () => false}); // enforce change when switching to different activity, even if it has the same config value
    editableConfig = computed<ActivityConfigModel>(() => JSON.parse(this.serializedConfig())); // we edit a copy of the actual config
    serializedEditedConfig = signal<string>(null);
    hasConfigChanged: Signal<boolean>;

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
        for (const [i, store] of this.editableConfig().preferredStores.entries()) {
            if (store?.length === 0) {
                this.editableConfig().preferredStores[i] = null;
            }
        }
        this.save.emit(this.editableConfig());
    }

    checkForChanges() {
        this.serializedEditedConfig.set(JSON.stringify(this.editableConfig()));
    }
}
