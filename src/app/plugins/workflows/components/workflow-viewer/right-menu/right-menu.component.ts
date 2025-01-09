import {Component, input, signal, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {Activity} from '../workflow';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityConfigModel, RenderModel, Settings} from '../../../models/workflows.model';
import {WorkflowsWebSocketService} from '../../../services/workflows-websocket.service';


export type MenuTabs = 'settings' | 'variables' | 'outputs' | 'execution';

@Component({
    selector: 'app-right-menu',
    templateUrl: './right-menu.component.html',
    styleUrl: './right-menu.component.scss'
})
export class RightMenuComponent {
    isEditable = input.required<boolean>();
    activity = input.required<Activity>();

    @ViewChild('offcanvas') menu: OffcanvasComponent;
    activeTab = signal<MenuTabs>('settings');

    constructor(private readonly _workflows: WorkflowsService, private readonly _websocket: WorkflowsWebSocketService) {
    }

    toggleMenu() {
        this.menu.visible = !this.menu.visible;
    }

    showMenu() {
        this.menu.visible = true;
    }

    hideMenu() {
        this.menu.visible = false;
    }

    isVisible() {
        return this.menu?.visible;
    }

    save(settings: Settings, config: ActivityConfigModel, rendering: RenderModel) {
        this._websocket.updateActivity(this.activity().id, settings, config, rendering);
    }
}
