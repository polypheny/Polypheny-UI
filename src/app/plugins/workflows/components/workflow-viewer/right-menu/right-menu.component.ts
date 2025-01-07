import {Component, input, Input, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {Activity} from '../workflow';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityConfigModel} from '../../../models/workflows.model';
import {WorkflowsWebSocket} from '../../../services/workflows-webSocket';


export type MenuTabs = 'settings' | 'variables' | 'outputs' | 'execution';

@Component({
    selector: 'app-right-menu',
    templateUrl: './right-menu.component.html',
    styleUrl: './right-menu.component.scss'
})
export class RightMenuComponent implements OnInit, OnDestroy {
    @Input() websocket: WorkflowsWebSocket;
    activity = input.required<Activity>();

    @ViewChild('offcanvas') menu: OffcanvasComponent;
    activeTab = signal<MenuTabs>('settings');

    constructor(private readonly _workflows: WorkflowsService) {
    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
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

    saveConfig(config: ActivityConfigModel) {
        this.websocket.updateActivity(this.activity().id, null, config, null);
    }
}
