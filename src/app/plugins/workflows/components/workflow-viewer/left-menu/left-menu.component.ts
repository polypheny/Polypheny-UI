import {Component, EventEmitter, input, Output, signal} from '@angular/core';
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

    visible = signal(true);

    private readonly registry = this._workflows.getRegistry();
    readonly activityTypes = this.registry.getTypes();
    readonly dropdownCats: { id: number; itemName: string; }[] = [];
    // https://www.npmjs.com/package/angular2-multiselect-dropdown
    readonly dropdownSettings = {
        singleSelection: false,
        text: 'Filter by category',
        noDataLabel: 'No categories found',
        enableSearchFilter: true,
        enableCheckAll: false,
        enableFilterSelectAll: false,
        classes: 'categories-multiselect'
    };
    filterText: string;
    selectedCategories = [];
    filteredList: ActivityDef[];
    showDescription = false;

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
        this.visible.update(b => !b);
    }

    onDragDropped($event: CdkDragDrop<any>) {
        this.createAt.emit([$event.item.data, $event.dropPoint]);
    }

    onItemSelect() {
        this.filterList();
    }

    OnItemDeSelect() {
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
                !this.selectedCategories.some(item => !def.categories.includes(item.itemName));

        }).map(type => this.registry.getDef(type));
    }
}
