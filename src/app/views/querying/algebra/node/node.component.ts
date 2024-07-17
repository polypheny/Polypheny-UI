import {AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {AlgType, Node} from '../algebra.model';
import {SortDirection, SortState} from '../../../../components/data-view/models/sort-state.model';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-node',
    templateUrl: './node.component.html',
    styleUrls: ['./node.component.scss']
})
export class NodeComponent implements OnInit, AfterViewChecked {

    constructor() {
    }

    isView = false;

    @ViewChild('element', {read: ElementRef}) public element: ElementRef;
    @Input() node: Node;
    @Output() autocompleteChanged = new EventEmitter();


    protected readonly AlgType = AlgType;

    ngOnInit() {

    }

    ngAfterViewChecked() {
        this.node.height = this.element.nativeElement.offsetHeight;
        this.node.width = this.element.nativeElement.offsetWidth;
    }

    addSortColumn() {
        this.node.sortColumns.push(new SortState());
        this.node.height += 35;
    }

    addProjectionColumn() {
        this.node.fields.push('');
        this.node.height += 35;
    }

    removeSortColumn(index: number) {
        if (this.node.sortColumns.length > 1) {
            this.node.sortColumns.splice(index, 1);
            this.node.height -= 35;
        }
    }

    removeProjectionColumn(index: number) {
        if (this.node.fields.length > 1) {
            this.node.fields.splice(index, 1);
            this.node.height -= 35;
        } else {
            this.node.fields[0] = '';
        }
        this.autocompleteChange();
    }

    sortColumn(node: Node, event: CdkDragDrop<string[]>) {
        moveItemInArray(node.sortColumns, event.previousIndex, event.currentIndex);
    }

    toggleDirection(col: SortState) {
        col.direction = col.direction === SortDirection.DESC ? SortDirection.ASC : SortDirection.DESC;
    }

    getAcCols(): string[] {
        return [...this.node.acColumns];
    }

    getAcTableCols(): string[] {
        return [...this.node.acTableColumns];
    }

    autocompleteChange() {
        if (this.node.initialNames.includes(this.node.entityName)) {
            const index = this.node.initialNames.indexOf(this.node.entityName);
            this.node.entityType = this.node.tableTypes[index];
            this.isView = this.node.tableTypes[index] === 'VIEW';

        }
        this.autocompleteChanged.emit();
    }

    trackFields(index: number, obj: any): any {
        return obj.length;
    }
}
