import {Component, EventEmitter, input, Output, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {WorkflowsService} from '../../../services/workflows.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-left-menu',
    templateUrl: './left-menu.component.html',
    styleUrl: './left-menu.component.scss'
})
export class LeftMenuComponent {
    isEditable = input.required<boolean>();
    @Output() create = new EventEmitter<string>();
    @Output() createAt = new EventEmitter<[string, { x: number, y: number }]>();


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

    onDragDropped($event: CdkDragDrop<any>) {
        this.createAt.emit([$event.item.data, $event.dropPoint]);
    }
}
