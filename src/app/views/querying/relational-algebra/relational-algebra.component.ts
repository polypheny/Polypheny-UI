import {AfterViewInit, Component, Input, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {LogicalOperators} from './relational-algebra.model';
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

  resultSet: ResultSet;
  private counter = 0;
  public connections = new Map<string, Connection>();
  public temporalLine: SvgLine;
  private nodes = new Map<string, Node>();

  //offsets
  private offsetX1 = 1;
  private offsetX2 = 3;
  private offsetY1 = 0;
  private offsetY2 = 6;

  constructor(
    private _crud: CrudService,
    private _toast: ToastService
  ) { }

  ngOnInit() {}

  ngAfterViewInit() {
    this.initDraggable();
  }

  ngOnDestroy() {
    this.counter = 0;
    $(document).off();
    $('#drop').off();
  }

  initDraggable() {
    const self = this;

    $('.rel-op').draggable({
      helper: 'clone',
      appendTo: 'body',
      cursor: 'grabbing'
    });

    $('#drop').droppable({
      drop: function( e, ui ){
        if( $(ui.draggable).hasClass('rel-op') ){
          const leftPosition = ui.position.left - 220;
          const topPosition = ui.position.top - 100;
          const type = $(ui.draggable).text();
          //$('#drop').append('<div class="card node" style="left: ' + leftPosition + 'px; top: ' + topPosition + 'px;" id="node' + self.counter++ + '"><div class="in"></div><div class="out"></div><span class="drag-handle">' + label + '</span><span class="del"><i class="cui-trash"></i></span></div>');
          const node = new Node( 'node'+ self.counter++, type, leftPosition, topPosition );
          $('#drop').append( self.createNode( node ));
          self.nodes.set( node.getId(), node );
          $('#drop .card').draggable({containment: '#drop', handle: '.drag-handle'});
        }
      }
    });

    let isDragging = false;
    let source = '';
    $(document).on('mousedown', '#drop .node .out',function(e){
        isDragging = true;
        $('#drop').addClass('connecting');
        const x = $(e.target).parents('.node').position().left + $(e.target).parents('.node').outerWidth()/2;
        const y = $(e.target).parents('.node').position().top;
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

    $('#drop').on('click', '.del', function(){
        const id = $(this).parents('.node').attr('id');
        self.connections.forEach( (v, k) => {
          if( v.target.getId() === id || v.source.getId() === id) {
            self.connections.delete( k );
          }
        });
        self.nodes.delete(id);
        $(this).parents('.node').remove();
        self.connections.delete( id );
    });
  }

  createNode( node: Node ) {
    let parameters: string[];
    switch ( node.type ) {
      case 'TableScan':
        parameters = ['table'];
        break;
      case 'Join':
        parameters = ['join', 'operator', 'col1', 'col2'];
        break;
      case 'Filter':
        parameters = ['operator', 'field', 'filter'];
        break;
      default:
        parameters = [];
    }
    let params = '';
    parameters.forEach( (v, i) => {
      params += `<li class="param list-group-item"><div class="form-group"><label for="${node.getId()}param${i}">${v}</label><input type="text" placeholder="${v}" id="${node.getId()}param${i}" class="form-control form-control-sm"></div></li>`;
    });
    if(parameters.length > 0){
      params = '<ul class="list-group list-group-flush form-inline">' + params + '</ul>';
    }
    return '<div class="card node" style="left: ' + node.left + 'px; top: ' + node.top + 'px;" id="' + node.id + '"><div class="in"></div><div class="out"></div><div class="drag-handle card-header">' + node.type + '<span class="del float-right"><i class="cui-trash"></i></span></div>' + params + '</div>';
  }

  addConnection( source, target ) {
    if( this.connections.has( source + target )){
      this.connections.delete( source + target );
    }else {
      this.connections.set( source + target, {source: this.nodes.get(source), target: this.nodes.get(target) });
    }
  }

  /**
   * List enums of LogicalOperators for the select menu
   */
  getOperators () {
    //from https://stackoverflow.com/questions/43100718/typescript-enum-to-object-array
    return Object.keys(LogicalOperators)
      .filter(k => !isNaN(Number(k)))
      .map(key => LogicalOperators[key]);
  }

  getX1( s ){
    if( s === undefined ) { return; }
    const ele = $('#'+s);
    return $(ele).position().left + $(ele).width()/2 + this.offsetX1;
  }
  getX2( t ){
    if( t === undefined ) { return; }
    const ele = $('#'+t);
    return $(ele).position().left + $(ele).width()/2 + this.offsetX2;
  }
  getY1( s ){
    if( s === undefined ) { return; }
    const ele = $('#'+s);
    return $(ele).position().top + this.offsetY1;
  }
  getY2( t ){
    if( t === undefined ) { return; }
    const ele = $('#'+t);
    return $(ele).position().top + $(ele).height() + this.offsetY2;
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
    $('#' + node.getId()).find('.param').each( function(e){
      const param = $(this).find('label').text();
      const value = $(this).find('input').val();
      node[param] = value;
    });
    node = this.getInputCount( node );
    return node;
  }

  getInputCount( node: Node ) {
    let counter = 0;
    this.connections.forEach( conn => {
      if( conn.target.getId() === node.getId() ){
        counter++;
      }
    });
    node.setInputCount( counter );
    return node;
  }

}

interface Connection{
  source: Node;
  target: Node;
}

class Node{
  children: Node[] = [];
  inputCount = 0;
  constructor(
    public id: string,
    public type: string,
    public left: number,
    public top: number
  ){}
  getId(){
    return this.id;
  }
  setChildren(nodes: Node[] ){
    this.children = nodes;
  }
  setInputCount( inputCount: number ){
    this.inputCount = inputCount;
  }
  clone(){
    return new Node( this.id, this.type, this.left, this.top );
  }
}
