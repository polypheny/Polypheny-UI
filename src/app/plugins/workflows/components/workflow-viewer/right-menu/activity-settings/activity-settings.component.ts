import {Component, computed, effect, input, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {GroupDef, SettingType} from '../../../../models/activity-registry.model';
import {Activity, Settings, VariableReference} from '../../workflow';
import {WorkflowsWebSocketService} from '../../../../services/workflows-websocket.service';
import {ToasterService} from '../../../../../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-activity-settings',
    templateUrl: './activity-settings.component.html',
    styleUrl: './activity-settings.component.scss'
})
export class ActivitySettingsComponent implements OnInit {
    protected readonly SettingType = SettingType;

    activity = input.required<Activity>();
    isEditable = input.required<boolean>();

    activeSettingGroup = signal<GroupDef>(null);
    private readonly resetSettingsSignal = signal(true); // manually enforce recomputing settings
    readonly serializedSettings = computed(() => {
            this.resetSettingsSignal();
            return this.activity().settings().serialize();
        },
        {equal: () => false}); // enforce change when switching to different activity, even if it has the same settings value
    readonly editableSettings = computed<Settings>(() => new Settings(this.serializedSettings())); // we edit a copy of the actual settings
    readonly editableReferences = computed<Map<string, VariableReference[]>>(() => {
        const map = new Map<string, VariableReference[]>();
        this.editableSettings().settings.forEach((setting, key) => map.set(key, setting.references));
        return map;
    });
    readonly serializedEditedSettings = signal<string>(null);
    hasSettingsChanged: Signal<boolean>;
    readonly visibilityMap = new Map<string, boolean>();
    readonly variablesVisibilityMap = new Map<string, WritableSignal<boolean>>();

    constructor(private readonly _websocket: WorkflowsWebSocketService, private readonly _toast: ToasterService) {
        effect(() => this.activeSettingGroup.set(this.activity().def.getFirstGroup()), {allowSignalWrites: true});

        // if activity or settings (externally) changes, also update serialized edited settings.
        effect(() => {
            this.serializedEditedSettings.set(this.serializedSettings());
            this.updateVisibility();
            this.resetVariablesVisibility();
        }, {allowSignalWrites: true});
    }

    ngOnInit(): void {
        this.hasSettingsChanged = computed(() => this.serializedSettings() !== this.serializedEditedSettings());
        //this.updateVisibility();
    }

    saveSettings() {
        this._websocket.updateActivity(this.activity().id, this.editableSettings().toModel(true), null, null);
    }

    checkForChanges() {
        this.updateVisibility();
        this.serializedEditedSettings.set(this.editableSettings().serialize());
    }

    toggleVariablesVisibility(key: string) {
        this.variablesVisibilityMap.get(key).update(v => !v);
    }

    private updateVisibility() {
        this.visibilityMap.clear();
        const def = this.activity().def;
        const settingsModel = this.editableSettings().toModel(false);
        this.activity().settings().keys().forEach(key => {
            this.visibilityMap.set(key, def.getSettingDef(key).isVisible(settingsModel));
        });

    }

    private resetVariablesVisibility() {
        this.variablesVisibilityMap.clear();
        this.activity().settings().keys().forEach(key => {
            this.variablesVisibilityMap.set(key, signal(false));
        });
    }

    addVariableRef(key: string, variable: string, pointer: string, target: string) {
        // TODO: better handling of edge cases with better feedback
        const variablePointer = pointer.length > 0 ? variable + '/' + pointer : variable;
        if (variablePointer.length === 0) {
            this._toast.warn(`Please specify a variablePointer`, 'Invalid Variable Reference');
        } else if (this.editableSettings().get(key).addReference(variablePointer, target)) {
            this.checkForChanges();
        } else {
            this._toast.warn(`The specified target "${target}" is not a valid json pointer for this object`, 'Invalid Variable Reference');
        }

    }

    deleteReference(key: string, ref: VariableReference) {
        this.editableSettings().get(key).deleteReference(ref);
        this.checkForChanges();
    }

    resetSettings() {
        this.resetSettingsSignal.set(false);
        this.resetSettingsSignal.set(true);
    }
}
