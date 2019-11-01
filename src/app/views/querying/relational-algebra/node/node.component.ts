import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Node} from '../relational-algebra.model';
import {SortDirection, SortState} from '../../../../components/data-table/models/sort-state.model';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.scss']
})
export class NodeComponent implements OnInit, AfterViewInit {

  constructor() { }

  @ViewChild('nodeEle', {static: false}) public nodeEle: ElementRef;
  @Input() node: Node;
  @Output() autocompleteChanged = new EventEmitter();

  ngOnInit() {
  }

  ngAfterViewInit(){
    this.node.setHeight(this.nodeEle.nativeElement.offsetHeight);
    this.node.setWidth(this.nodeEle.nativeElement.offsetWidth);
  }

  addSortColumn(){
    this.node.sortColumns.push( new SortState() );
    this.node.setHeight( this.node.getHeight() + 35 );
  }

  removeSortColumn( index:number ) {
    if( this.node.sortColumns.length > 1){
      this.node.sortColumns.splice( index, 1 );
      this.node.setHeight( this.node.getHeight() - 35 );
    }
  }

  sortColumn(node:Node, event: CdkDragDrop<string[]>) {
    moveItemInArray(node.sortColumns, event.previousIndex, event.currentIndex);
  }

  toggleDirection( col:SortState ){
    if( col.direction === SortDirection.DESC){
      col.direction = SortDirection.ASC;
    } else {
      col.direction = SortDirection.DESC;
    }
  }

  getAcCols(): string[]{
    return [...this.node.getAcColumns()];
  }

  getAcTableCols(): string[]{
    return [...this.node.getAcTableColumns()];
  }

  autocompleteChange(){
    this.autocompleteChanged.emit();
  }

}
