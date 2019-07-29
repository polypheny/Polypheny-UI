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
  private connections = new Map<string, Connection>();
  private temporalLine: SvgLine;
  private nodes = new Map<string, Node>();

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
          const label = $(ui.draggable).text();
          $('#drop').append('<div class="card node" style="left: ' + leftPosition + 'px; top: ' + topPosition + 'px;" id="node' + self.counter++ + '"><div class="in"></div><div class="out"></div><span class="drag-handle">' + label + '</span><span class="del"><i class="cui-trash"></i></span></div>');
          self.nodes.set('node' + self.counter, new Node( 'node' + self.counter, label ) );
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
        if(!isDragging) return;
        if( $(e.target).hasClass( 'in' ) ){
          const target = $(e.target).parents('.node').attr('id');
          self.addConnection( source, target );
        }
        isDragging = false;
        $('#drop').removeClass('connecting');
        self.temporalLine = null;
    });

    $('#drop').on('click', '.del', function(){
        const id = $(this).parents('.node').attr('id');
        self.connections.forEach( (v, k) => {
          if( v.target === id || v.source === id) {
            self.connections.delete( k );
          }
        });
        $(this).parents('.node').remove();
        self.connections.delete( id );
    });
  }

  addConnection( source, target ) {
    if( this.connections.has( source + target )){
      this.connections.delete( source + target );
    }else {
      this.connections.set( source + target, {source: source, target: target });
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
    if( s === undefined ) return;
    const ele = $('#'+s);
    return $(ele).position().left + $(ele).width()/2 + 15;
  }
  getX2( t ){
    if( t === undefined ) return;
    const ele = $('#'+t);
    return $(ele).position().left + $(ele).width()/2 + 15;
  }
  getY1( s ){
    if( s === undefined ) return;
    const ele = $('#'+s);
    return $(ele).position().top;
  }
  getY2( t ){
    if( t === undefined ) return;
    const ele = $('#'+t);
    return $(ele).position().top + $(ele).height() + 40;
  }

  runPlan(){
    //todo
    console.log( this.connections );
  }

}

interface Connection{
  source: string;
  target: string;
}

class Node{
  constructor(
    public id: string,
    public label: string
  ){}
}
