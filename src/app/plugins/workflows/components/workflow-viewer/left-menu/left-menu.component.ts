import {Component, EventEmitter, input, Output, ViewChild} from '@angular/core';
import {OffcanvasComponent} from '@coreui/angular';
import {WorkflowsService} from '../../../services/workflows.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {ActivityDef} from '../../../models/activity-registry.model';

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
    readonly dropdownCats: { id: number; itemName: string; }[] = [];
    // https://www.npmjs.com/package/angular2-multiselect-dropdown
    readonly dropdownSettings = {
        singleSelection: false,
        text: 'Filter by category',
        enableSearchFilter: true,
        enableCheckAll: false,
        enableFilterSelectAll: false,
        classes: 'categories-multiselect'
    };
    filterText: string;
    selectedCategories = [];
    filteredList: ActivityDef[];

    openedActivityDef: ActivityDef; // for info

    constructor(private readonly _workflows: WorkflowsService) {
        const categories = this.registry.categories;
        for (const [i, category] of categories.entries()) {
            this.dropdownCats.push({
                'id': i,
                'itemName': category
            });
        }
        this.filterList();
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

    onItemSelect(item: any) {
        console.log(item);
        console.log(this.selectedCategories);
        this.filterList();
    }

    OnItemDeSelect(item: any) {
        console.log(item);
        console.log(this.selectedCategories);
        this.filterList();
    }

    filterList() {
        this.filteredList = this.activityTypes.filter(type => {
            const def = this.registry.getDef(type);
            const trimmed = this.filterText?.trim().toLowerCase();
            if (trimmed?.length > 0 && !(
                type.toLowerCase().includes(trimmed) || def.displayName.toLowerCase().includes(trimmed)
            )) {
                return false;
            }
            return this.selectedCategories.length === 0 ||
                this.selectedCategories.find(item => def.categories.includes(item.itemName));

        }).map(type => this.registry.getDef(type));
    }
}
