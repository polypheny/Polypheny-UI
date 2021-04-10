import {AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Node} from '../relational-algebra.model';
import {SortDirection, SortState} from '../../../../components/data-view/models/sort-state.model';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.scss']
})
export class NodeComponent implements OnInit, AfterViewChecked {

  constructor() { }

  @ViewChild('nodeEle', {static: false}) public nodeEle: ElementRef;
  @Input() node: Node;
  @Output() autocompleteChanged = new EventEmitter();
  public highlighted = "node1";

  ngOnInit() {

  }

  ngAfterViewChecked(){
    this.node.setHeight(this.nodeEle.nativeElement.offsetHeight);
    this.node.setWidth(this.nodeEle.nativeElement.offsetWidth);
  }

  addSortColumn(){
    this.node.sortColumns.push( new SortState() );
    this.node.setHeight( this.node.getHeight() + 35 );
  }

  addProjectionColumn(){
    this.node.fields.push('');
    this.node.setHeight( this.node.getHeight() + 35 );
  }

  removeSortColumn( index:number ) {
    if( this.node.sortColumns.length > 1){
      this.node.sortColumns.splice( index, 1 );
      this.node.setHeight( this.node.getHeight() - 35 );
    }
  }

  removeProjectionColumn( index:number ) {
    if( this.node.fields.length > 1){
      this.node.fields.splice( index, 1 );
      this.node.setHeight( this.node.getHeight() - 35 );
    } else {
      this.node.fields[0] = '';
    }
    this.autocompleteChange();
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

  trackFields(index: number, obj: any): any {
    return obj.length;
  }


}
