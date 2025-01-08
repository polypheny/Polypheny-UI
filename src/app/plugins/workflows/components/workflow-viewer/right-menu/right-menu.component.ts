import {Component, EventEmitter, input, Output, signal, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {Activity} from '../workflow';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityConfigModel, RenderModel, Settings} from '../../../models/workflows.model';


export type MenuTabs = 'settings' | 'variables' | 'outputs' | 'execution';

@Component({
    selector: 'app-right-menu',
    templateUrl: './right-menu.component.html',
    styleUrl: './right-menu.component.scss'
})
export class RightMenuComponent {
    isEditable = input.required<boolean>();
    activity = input.required<Activity>();
    @Output() save = new EventEmitter<[Settings, ActivityConfigModel, RenderModel]>();


    @ViewChild('offcanvas') menu: OffcanvasComponent;
    activeTab = signal<MenuTabs>('settings');

    constructor(private readonly _workflows: WorkflowsService) {
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
}
