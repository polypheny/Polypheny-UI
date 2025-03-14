import {Component, EventEmitter, input, Output, signal} from '@angular/core';
import {WorkflowsService} from '../../../services/workflows.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {ActivityCategory, ActivityDef} from '../../../models/activity-registry.model';

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
    readonly isRelational: Record<string, boolean> = {};
    readonly isDocument: Record<string, boolean> = {};
    readonly isGraph: Record<string, boolean> = {};
    readonly isVariables: Record<string, boolean> = {};
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
        const defaultCat = this.dropdownCats.find(item => item.itemName === 'ESSENTIALS');
        if (defaultCat) {
            this.selectedCategories.push(defaultCat);
        }

        for (const type of this.activityTypes) {
            const cats = this.registry.getDef(type).categories;
            this.isRelational[type] = cats.includes(ActivityCategory.RELATIONAL);
            this.isDocument[type] = cats.includes(ActivityCategory.DOCUMENT);
            this.isGraph[type] = cats.includes(ActivityCategory.GRAPH);
            this.isVariables[type] = cats.includes(ActivityCategory.VARIABLES);
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

        }).map(type => this.registry.getDef(type))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
}
