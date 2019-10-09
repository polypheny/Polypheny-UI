import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {Node} from '../relational-algebra.model';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.scss']
})
export class NodeComponent implements OnInit, AfterViewInit {

  constructor() { }

  @ViewChild('nodeEle', {static: false}) public nodeEle: ElementRef;
  @Input() node: Node;

  //parameters:
  //TableScan
  tableName;
  //Join
  join = 'INNER';
  operator = '=';
  col1;
  col2;
  //filter
  //(operator)
  field;
  filter;
  //project
  fields;

  ngOnInit() {
  }

  ngAfterViewInit(){
    this.node.height = this.nodeEle.nativeElement.offsetHeight;
  }

}
