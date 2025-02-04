import {Component, computed, effect, input, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {GroupDef, SettingType} from '../../../../models/activity-registry.model';
import {Activity, Settings, VariableReference} from '../../workflow';
import {WorkflowsWebSocketService} from '../../../../services/workflows-websocket.service';
import {ToasterService} from '../../../../../../components/toast-exposer/toaster.service';
import {Variables} from '../../../../models/workflows.model';

@Component({
    selector: 'app-activity-settings',
    templateUrl: './activity-settings.component.html',
    styleUrl: './activity-settings.component.scss'
})
export class ActivitySettingsComponent implements OnInit {
    protected readonly SettingType = SettingType;

    activity = input.required<Activity>();
    workflowVars = input.required<Variables>();
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
    readonly visibleSettings = new Set<string>();
    readonly visibleSubgroups = new Set<string>();
    readonly variablesVisibilityMap = new Map<string, WritableSignal<boolean>>();
    showDescription = true;

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
        this.visibleSettings.clear();
        this.visibleSubgroups.clear();
        const def = this.activity().def;
        const settingsModel = this.editableSettings().toModel(false);
        this.activity().settings().keys().forEach(key => {
            const settingDef = def.getSettingDef(key);
            if (settingDef.isVisible(settingsModel)) {
                this.visibleSettings.add(key);
                this.visibleSubgroups.add(settingDef.getGroup() + '/' + settingDef.getSubgroup());
            }
        });

    }

    private resetVariablesVisibility() {
        this.variablesVisibilityMap.clear();
        this.activity().settings().keys().forEach(key => {
            const isVisible = this.activity().settings().get(key).references.length > 0;
            this.variablesVisibilityMap.set(key, signal(isVisible));
        });
    }

    addVariableRef(key: string, event: [string, string, string]) {
        const [variable, pointer, target] = event;

        const variablePointer = variable + this.prefixWithSlash(pointer);
        if (this.editableSettings().get(key).addReference(variablePointer, target)) {
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

    private prefixWithSlash(str: string): string {
        if (str.length > 0 && !str.startsWith('/')) {
            return '/' + str;
        }
        return str;
    }
}
