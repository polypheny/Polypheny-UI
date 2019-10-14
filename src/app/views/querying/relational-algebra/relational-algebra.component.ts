import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {Connection, LogicalOperator, Node} from './relational-algebra.model';
import {ResultSet} from '../../../components/data-table/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../../components/toast/toast.service';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import {SvgLine} from '../../uml/uml.model';

@Component({
  selector: 'app-relational-algebra',
  templateUrl: './relational-algebra.component.html',
  styleUrls: ['./relational-algebra.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class RelationalAlgebraComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('dropArea', {static: false}) dropArea: ElementRef;
  resultSet: ResultSet;
  private counter = 0;
  public connections = new Map<string, Connection>();
  public temporalLine: SvgLine;
  public nodes = new Map<string, Node>();
  operators = [];

  //offsets
  private offsetX1 = 1;
  private offsetX2 = 3;
  private offsetY1 = 0;
  private offsetY2 = 5;

  //temporal values while dragging
  scrollTop: number;
  scrollLeft: number;
  draggingNodeX: number;
  draggingNodeY: number;

  constructor(
    private _crud: CrudService,
    private _toast: ToastService
  ) { }

  ngOnInit() {
    this.getOperators();
  }

  ngAfterViewInit() {
    this.initDraggable();
  }

  ngOnDestroy() {
    this.counter = 0;
    $(document).off();
    $('#drop').off();
  }

  dropped( event ){
    if(event.previousContainer.id === 'operatorList'){
      const id = 'node' + this.counter++;
      //todo calculate correct position
      this.nodes.set( id, new Node(id, event.item.data, event.distance.x, event.distance.y ));
    }
  }

  initDraggable() {
    const self = this;

    let isDragging = false;
    let source = '';
    $(document).on('mousedown', '#drop .node .out',function(e){
        isDragging = true;
        $('#drop').addClass('connecting');
        const x = $(e.target).parents('.node').parent().position().left + $(e.target).parents('.node').outerWidth()/2;
        const y = $(e.target).parents('.node').parent().position().top;
        self.temporalLine = {x1: x, x2: x, y1: y, y2: y};
        source = $(e.target).parents('.node').attr('id');
    }).on('mousemove', function(e){
      if( isDragging){
        e.preventDefault();
        const dropContainer = $('#drop');
        const x = e.pageX - $(dropContainer).offset().left;
        const y = e.pageY - $(dropContainer).offset().top;
        self.temporalLine.x2 = x;
        self.temporalLine.y2 = y;
      }
    }).on('mouseup',function(e){
        if(!isDragging) { return; }
        if( $(e.target).hasClass( 'in' ) ){
          const target = $(e.target).parents('.node').attr('id');
          if( source !== target ){//don't allow to connect with own node
            self.addConnection( source, target );
          }
        }
        isDragging = false;
        $('#drop').removeClass('connecting');
        self.temporalLine = null;
    });

  }

  deleteNode( node: Node ){
    const id = node.getId();
    this.connections.forEach( (v, k) => {
      if( v.target.getId() === id || v.source.getId() === id) {
        this.connections.delete( k );
      }
    });
    this.nodes.delete(id);
    this.connections.delete( id );
  }

  addConnection( source, target ) {
    if( this.connections.has( source + target )){
      this.connections.delete( source + target );
    }else {
      this.connections.set( source + target, {source: this.nodes.get(source), target: this.nodes.get(target) });
    }
  }

  /**
   * List LogicalOperators for the select menu
   */
  getOperators () {
    //see https://stackoverflow.com/questions/43100718/typescript-enum-to-object-array
    this.operators = Object.keys(LogicalOperator)
      .filter(k => !isNaN(Number(k)))
      .map(key => LogicalOperator[key]);
  }

  getX1( s: Node ){
    if( s === undefined ) { return; }
    const ele = $('#'+s.getId());
    if( ! s.isDragging() ){
      return $(ele).parent().position().left + $(ele).width()/2 + this.offsetX1;
    } else {
      return this.draggingNodeX + $(ele).parent().width()/2 + 35;
    }
  }
  getX2( t: Node ){
    if( t === undefined ) { return; }
    const ele = $('#'+t.getId());
    if( ! t.isDragging() ){
      return $(ele).parent().position().left + $(ele).width()/2 + this.offsetX2;
    } else {
      return this.draggingNodeX + $(ele).parent().width()/2 + 36;
    }
  }
  getY1( s: Node ){
    if( s === undefined ) { return; }
    const ele = $('#'+s.getId());
    if( ! s.isDragging() ){
      return $(ele).parent().position().top + this.offsetY1;
    } else {
      return this.draggingNodeY + this.offsetY1;
    }
  }
  getY2( t: Node ){
    if( t === undefined ) { return; }
    const ele = $('#'+t.getId());
    if( ! t.isDragging() ){
      return $(ele).parent().position().top + $(ele).height() + this.offsetY2;
    } else {
      return this.draggingNodeY + t.height + this.offsetY2;
    }
  }

  runPlan(){
    $('#run i').removeClass().addClass('fa fa-hourglass-half');
    let tree;
    if( this.connections.size === 0 ){
      if( this.nodes.size === 1 ){
        //get only node in Map
        tree = this.walkTree( this.nodes.values().next().value.clone() );
      }else {
        $('#run i').removeClass().addClass('fa fa-play');
        this._toast.toast( 'no plan', 'Please provide a plan to be executed.', 10, 'bg-warning' );
        return;
      }
    }else{
      tree = this.walkTree( this.getTopNode().clone() );
    }
    this._crud.executeRelAlg( tree ).subscribe(
      res => {
        $('#run i').removeClass().addClass('fa fa-play');
        this.resultSet = <ResultSet> res;
        }, err => {
        $('#run i').removeClass().addClass('fa fa-play');
        this._toast.toast( 'Server error', 'Could not execute relational algebra: ', 0, 'bg-danger' );
      }
    );
  }

  getTopNode(){
    let topNode: Node;
    const haveOutgoingConnections = new Map<string, Node>();
    this.connections.forEach( (v, k) => {
      haveOutgoingConnections.set( v.source.getId(), v.source );
      if( !haveOutgoingConnections.get( v.target.getId()) ){
        topNode = v.target;
      }
    });
    return topNode;
  }

  walkTree ( node: Node ) {
    const children = [];
    this.connections.forEach(( v, k ) => {
      if( v.target.getId() === node.getId() ){
        children.push( this.walkTree(v.source) );
      }
    });
    node.setChildren(children);
    node.setInputCount( children.length );
    return node;
  }

  dragStart(e, node: Node) {
    this.scrollTop = document.documentElement.scrollTop;
    this.scrollLeft = document.documentElement.scrollLeft;
    node.setDragging(true);
  }

  draggingNode( e, node: Node ){
    //todo scrolling fix
    this.draggingNodeX = node.left + e.distance.x + document.documentElement.scrollLeft - this.scrollLeft;
    this.draggingNodeY = node.top + e.distance.y + document.documentElement.scrollTop - this.scrollTop;
  }

  savePos(e, node: Node){
    node.setDragging(false);
    const nodeElement = $('#' + node.id);
    const nodeWidth = $(nodeElement).width();
    const nodeHeight = $(nodeElement).height();
    const scrollTopDistance = document.documentElement.scrollTop - this.scrollTop;
    const scrollLeftDistance = document.documentElement.scrollLeft - this.scrollLeft;
    node.left = Math.max( 0, Math.min( node.left + e.distance.x + scrollLeftDistance, this.dropArea.nativeElement.offsetWidth - nodeWidth - 4 ));
    node.top = Math.max( 0, Math.min( node.top + e.distance.y + scrollTopDistance, this.dropArea.nativeElement.offsetHeight - nodeHeight - 4 ));
  }

  trackId( index: number, n: Node ): number {
    if(n.id){
      return Number.parseInt(n.id.substr(4));
    }else{
      return 1;
    }
  }

}
