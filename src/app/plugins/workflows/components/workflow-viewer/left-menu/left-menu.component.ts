import {Component, EventEmitter, input, Output, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {WorkflowsService} from '../../../services/workflows.service';

@Component({
    selector: 'app-left-menu',
    templateUrl: './left-menu.component.html',
    styleUrl: './left-menu.component.scss'
})
export class LeftMenuComponent {
    isEditable = input.required<boolean>();
    @Output() create = new EventEmitter<string>();


    @ViewChild('offcanvas') menu: OffcanvasComponent;

    private readonly registry = this._workflows.getRegistry();
    readonly activityTypes = this.registry.getTypes();
    selectedActivityType: string;

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
