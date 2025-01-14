import {Component, input, signal, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {Activity} from '../workflow';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityConfigModel, RenderModel, SettingsModel} from '../../../models/workflows.model';
import {WorkflowsWebSocketService} from '../../../services/workflows-websocket.service';


export type MenuTabs = 'settings' | 'variables' | 'outputs' | 'execution' | 'help';

@Component({
    selector: 'app-right-menu',
    templateUrl: './right-menu.component.html',
    styleUrl: './right-menu.component.scss'
})
export class RightMenuComponent {
    isEditable = input.required<boolean>();
    activity = input.required<Activity>();

    @ViewChild('offcanvas') menu: OffcanvasComponent;
    visible = signal(false);
    activeTab = signal<MenuTabs>('settings');

    constructor(private readonly _workflows: WorkflowsService, private readonly _websocket: WorkflowsWebSocketService) {
    }

    toggleMenu() {
        this.visible.update(b => !b);
    }

    save(settings: SettingsModel, config: ActivityConfigModel, rendering: RenderModel) {
        this._websocket.updateActivity(this.activity().id, settings, config, rendering);
    }
}
