import {Component, input, signal, ViewChild} from '@angular/core';
import {Activity} from '../workflow';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityConfigModel, RenderModel, SettingsModel, Variables} from '../../../models/workflows.model';
import {WorkflowsWebSocketService} from '../../../services/workflows-websocket.service';
import {ActivitySettingsComponent} from './activity-settings/activity-settings.component';
import {ActivityConfigEditorComponent} from './activity-config-editor/activity-config-editor.component';
import {ToasterService} from '../../../../../components/toast-exposer/toaster.service';


export type MenuTabs = 'settings' | 'variables' | 'config' | 'execution' | 'help';

@Component({
    selector: 'app-right-menu',
    templateUrl: './right-menu.component.html',
    styleUrl: './right-menu.component.scss'
})
export class RightMenuComponent {
    isEditable = input.required<boolean>();
    activity = input.required<Activity>();
    workflowVars = input.required<Variables>();

    @ViewChild('settings') settingsComponent: ActivitySettingsComponent;
    @ViewChild('config') configComponent: ActivityConfigEditorComponent;
    visible = signal(false);
    activeTab = signal<MenuTabs>('settings');

    constructor(private readonly _workflows: WorkflowsService,
                private readonly _websocket: WorkflowsWebSocketService,
                private readonly _toast: ToasterService
    ) {
    }

    toggleMenu() {
        this.visible.update(b => !b);
    }

    save(settings
         :
         SettingsModel, config
         :
         ActivityConfigModel, rendering
         :
         RenderModel
    ) {
        this._websocket.updateActivity(this.activity().id, settings, config, rendering);
    }

    changeActiveTab(tab: MenuTabs) {
        if (tab !== this.activeTab() && this.canSafelyNavigate()) {
            this.activeTab.set(tab);
        }
    }

    canSafelyNavigate(warn = true) {
        if (this.activeTab() === 'settings') {
            if (this.settingsComponent?.hasSettingsChanged()) {
                if (warn) {
                    this._toast.warn('Please save or discard any unsaved changes to the settings first.', 'Unsaved settings');
                    this.visible.set(true);
                }
                return false;
            }
        } else if (this.activeTab() === 'execution') {
            if (this.configComponent?.hasConfigChanged()) {
                if (warn) {
                    this._toast.warn('Please save or discard the unsaved changes to the config first.', 'Unsaved config');
                    this.visible.set(true);
                }
                return false;
            }
        }
        return true;
    }
}
