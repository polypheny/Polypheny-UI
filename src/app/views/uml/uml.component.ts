import {AfterViewInit, Component, OnInit} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import {ActivatedRoute} from '@angular/router';
import {Md5} from 'ts-md5/dist/md5';

@Component({
  selector: 'app-uml',
  templateUrl: './uml.component.html',
  styleUrls: ['./uml.component.scss']
})

export class UmlComponent implements OnInit, AfterViewInit {

  uml: UML[];
  lines: SvgLine[] = [];
  connections: Map<string, Connection> = new Map();
  dbId: number;

  existingConnections = [];

  constructor(private _route: ActivatedRoute) {
    this.existingConnections = [
      {source: '19f35b03310d187d2717fbeca10fa9bd', target: 'a5afb3700a1229679dff8b0238a6aa9a'} // demo: table2.e, table4.j
    ];
  }

  ngOnInit() {

    this.dbId = +this._route.snapshot.paramMap.get('id');

    this.uml = [
      {tableName: 'table1', cols: ['a', 'b', 'c'], methods: ['method1', 'method2']},
      {tableName: 'table2', cols: ['d', 'e', 'f'], methods: ['method1', 'method2']},
      {tableName: 'table3', cols: ['g', 'h', 'i', 'j'], methods: []},
      {tableName: 'table4', cols: ['so wide so wide so wide so wide so wide', 'h', 'i', 'j'], methods: ['method1', 'method2']},
      {tableName: 'table5', cols: ['so wide so wide so wide so wide so wide', 'h', 'i', 'j'], methods: ['method1', 'method2']}
    ];

  }

  ngAfterViewInit() {

    this.connectTables();
    this.dragTables();

    // todo throws error: ExpressionChangedAfterItHasBeenCheckedError (but not in production mode)
    this.loadExistingConnections();

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
    let offsetX = 215;
    //todo offsetX if sidebar
    const offsetY = 80;
    $(document).on('mousedown', '.uml .cols', function(e) {
      if($('body').hasClass('sidebar-lg-show')){
        offsetX = 380;
      } else {
        offsetX = 215;
      }
      isDragging = true;
      fromTable = $(e.target).parent().attr('id');
      source = $(e.target).attr('id');
      line = {x1: e.pageX - offsetX, y1: e.pageY - offsetY, x2: e.pageX - offsetX, y2: e.pageY - offsetY};
      self.lines.push(line);

      // todo control z-index when released

    }).on('mousemove', function (e) {
      if (isDragging) {
        line.x2 = e.pageX - offsetX;
        line.y2 = e.pageY - offsetY;
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

      const src = $(conn.source).offset();
      const tgt = $(conn.target).offset();
      if(src !== undefined && tgt !== undefined){
        const line = {x1: src.top + 5, x2: tgt.top + 5, y1: src.left, y2: tgt.left};
        this.lines.push(line);
      }
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
      return $(sourceEle).position().left + $(sourceEle).parent().position().left + $(sourceEle).width() + 26;
    }else{
      return $(sourceEle).position().left + $(sourceEle).parent().position().left + 20;
    }
  }
  /** get x position of div of target column
   * param: source:string, target:string -> ids of the column divs */
  getX2(source:string, target:string){
    if(source === undefined || target === undefined) return;
    const sourceEle = $('#'+source);
    const targetEle = $('#'+target);
    if( $(sourceEle).offset().left < $(targetEle).offset().left + $(targetEle).width()/2 ){
      return $(targetEle).position().left + $(targetEle).parent().position().left + 20;
    }else{
      return $(targetEle).position().left + $(targetEle).parent().position().left + $(targetEle).width() + 26;
    }
  }
  /** get y position of div of source/target column
   * param: source:string, target:string -> ids of the column divs */
  getY(ele:string){
    if(ele === undefined) return;
    const element= $('#'+ele);
    return $(element).position().top + $(element).parent().position().top + 34;
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
export interface SvgLine {
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
