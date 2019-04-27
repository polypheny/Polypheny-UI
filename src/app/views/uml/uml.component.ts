import {AfterViewInit, Component, OnInit} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import {ActivatedRoute} from '@angular/router';
import {Md5} from 'ts-md5/dist/md5';

// warning (linter) here because total file overwritten by copy paste?
@Component({
  selector: 'app-uml',
  templateUrl: './uml.component.html',
  styleUrls: ['./uml.component.scss']
})

export class UmlComponent implements OnInit, AfterViewInit {

  uml: UML[];
  lines: svgLine[];
  connections: Map<string, Connection> = new Map();
  dbId: number;

  existingConnections;

  constructor(private _route: ActivatedRoute) { }

  ngOnInit() {

    this.dbId = +this._route.snapshot.paramMap.get('id');

    this.uml = [
      {tableName: 'table1', cols: ['a', 'b', 'c'], methods: ['method1', 'method2']},
      {tableName: 'table2', cols: ['d', 'e', 'f'], methods: ['method1', 'method2']},
      {tableName: 'table3', cols: ['g', 'h', 'i', 'j'], methods: []},
      {tableName: 'table4', cols: ['so wide so wide so wide so wide so wide', 'h', 'i', 'j'], methods: ['method1', 'method2']},
      {tableName: 'table5', cols: ['so wide so wide so wide so wide so wide', 'h', 'i', 'j'], methods: ['method1', 'method2']}
    ];

    // todo error if it has values from the beginning
    this.existingConnections = [
      {source: 'col-table1-b', target: 'col-table2-f'},
      {source: 'col-table2-f', target: 'col-table3-h'},
      {source: 'col-table3-i', target: 'col-table4-j'}
    ];

    this.lines = [];

  }

  ngAfterViewInit() {
    // this.loadExistingConnections(); // todo throws error: ExpressionChangedAfterItHasBeenCheckedError
    this.connectTables();
    this.dragTables();
  }

  dragTables() {
    // const self = this;

    //todo expandable parent div: http://jsfiddle.net/74Sxn/
    $('.uml').draggable({
      handle: '.tableName',
      containment: 'parent'
    });
  }

  connectTables () {
    let line;
    const self = this;
    let isDragging = false;
    let fromTable;
    let source;
    $(document).on('mousedown', '.uml .cols', function(e) {
      isDragging = true;
      fromTable = $(e.target).parent().attr('id');
      source = $(e.target).attr('id');
      line = {x1: e.pageX, y1: e.pageY, x2: e.pageX, y2: e.pageY};
      self.lines.push(line);

      // todo control z-index when released

    }).on('mousemove', function (e) {
      if (isDragging) {
        line.x2 = e.pageX;
        line.y2 = e.pageY;
      }
    }).on('mouseup', function (e) {
      if ($(e.target).hasClass('cols') && $(e.target).parent().attr('id') !== fromTable) {
        const target = $(e.target).attr('id');
        const c:Connection = new Connection(source, target);
        self.connections.set(c.toString(),c);
      }
      self.lines.pop();
      isDragging = false;
    });
  }

  loadExistingConnections(){
    if(this.existingConnections === undefined || this.existingConnections.length === 0) return;
    for(const conn of this.existingConnections){
      const connObj = new Connection(conn.source, conn.target);
      this.connections.set(connObj.toString(), connObj);
    }
  }

  /** get x position of div of source column
   * param: source:string, target:string -> ids of the column divs */
  getX1(source:string, target:string){
    if(source === undefined || target === undefined) return;
    const sourceEle = $('#'+source);
    const targetEle = $('#'+target);
    if(sourceEle === undefined || targetEle === undefined) return;
    if($(sourceEle).offset().left < $(targetEle).offset().left){
      return $(sourceEle).offset().left + $(sourceEle).width() + 6;
    }else{
      return $(sourceEle).offset().left;
    }
  }
  /** get x position of div of target column
   * param: source:string, target:string -> ids of the column divs */
  getX2(source:string, target:string){
    if(source === undefined || target === undefined) return;
    const sourceEle = $('#'+source);
    const targetEle = $('#'+target);
    if($(sourceEle).offset().left < $(targetEle).offset().left){
      return $(targetEle).offset().left;
    }else{
      return $(targetEle).offset().left + $(targetEle).width() + 6;
    }
  }
  /** get y position of div of source/target column
   * param: source:string, target:string -> ids of the column divs */
  getY(ele:string){
    if(ele === undefined) return;
    const element= $('#'+ele);
    return $(element).offset().top + 10;
  }

  hash(s:string[]){
    const md5 = new Md5();
    for(const b of s){
      md5.appendStr(b);
    }
    return md5.end();
  }

}

export interface UML {
  tableName: string;
  cols: string[];
  methods?: string[];
}
export interface svgLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class Connection {
  source: string;
  target: string;
  constructor(s:string, t:string) {
    this.source = s;
    this.target = t;
  }

  equals(s:Connection){
    return this.source===s.source && this.target===s.target;
  }

  //must be unique for unique elements (key of the map)
  toString() {
    const md5 = new Md5();
    return md5.appendStr(this.source).appendStr(this.target).end() as string;
  }
}
