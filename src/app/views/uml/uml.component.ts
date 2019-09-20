import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {ActivatedRoute} from '@angular/router';
import {CrudService} from '../../services/crud.service';
import {EditTableRequest, SchemaRequest} from '../../models/ui-request.model';
import {DbTable, ForeignKey, SvgLine, Uml} from './uml.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {ModalDirective} from 'ngx-bootstrap';
import {FormBuilder} from '@angular/forms';
import {ToastService} from '../../components/toast/toast.service';
import {DbColumn, ResultSet} from '../../components/data-table/models/result-set.model';
import {DbmsTypesService} from '../../services/dbms-types.service';

@Component({
  selector: 'app-uml',
  templateUrl: './uml.component.html',
  styleUrls: ['./uml.component.scss']
})

export class UmlComponent implements OnInit, AfterViewInit, OnDestroy {

  uml: Uml;
  temporalLine: SvgLine;
  schema;
  connections = [];
  zIndex = 2;
  errorMsg:string;

  @ViewChild('myModal') myModal: ModalDirective;
  sourceTable;
  sourceCol;
  targetTable;
  targetCol;
  onUpdate = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT'];
  onDelete = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT'];
  fkForm = this._formBuilder.group({update: 'RESTRICT', delete: 'RESTRICT'});
  constraintName = 'fk1';


  //offsets
  offsetLineX1 = 15;
  offsetLineX2 = 220;
  offsetLineY = 150;
  offsetConnLeft1 = 21;
  offsetConnLeft2 = -5;
  offsetConnTop = 20;


  constructor(
    private _route: ActivatedRoute,
    private _crud: CrudService,
    private _leftSidebar: LeftSidebarService,
    private _formBuilder: FormBuilder,
    private _toast: ToastService,
    private _dbmsTypes: DbmsTypesService
  ) {
    this._dbmsTypes.getFkActions().subscribe(
      types => {
        this.onUpdate = types;
        this.onDelete = types;
      }
    );
  }

  ngOnInit() {
    this.schema = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe( params => {
      this.schema = params['id'];
      this.getUml();
    });
    this._leftSidebar.setSchema( new SchemaRequest( '/views/uml/', false, 1) );
  }

  ngAfterViewInit() {
    this.getUml();
    this.connectTables();
  }

  ngOnDestroy() {
    $(document).off();//remove event listener from connectTables() when leaving this view
    this._leftSidebar.close();
  }

  getUml () {
    if(!this.schema) {
      this.uml = null;
      this._leftSidebar.reset();
      return;
    }
    this._crud.getUml( new EditTableRequest( this.schema ) ).subscribe(
      res => {
        this.errorMsg = null;
        const uml:Uml = <Uml> res;
        this.uml = new Uml(uml.tables, uml.foreignKeys);
        this.mapConnections();
      }, err => {
        this.errorMsg = 'Could not connect with the server.';
      }
    );
  }

  getColumnClass( table: DbTable, col: DbColumn ){
    if( table.primaryKeyFields.indexOf(col.name) > -1 ){
      return 'bg-primary pk';
    } else if ( table.uniqueColumns.indexOf(col.name) > -1 ){
      return 'bg-warning unique';
    } else {
      return '';
    }
  }

  mapConnections() {
    this.connections = [];
    this.uml.foreignKeys.forEach((v, k) => {
      this.connections.push( { source: v.fkTableSchema+'_'+v.fkTableName+'_'+v.fkColumnName, target: v.pkTableSchema+'_'+v.pkTableName+'_'+v.pkColumnName, } );
    });
  }

  updateZIndex( e ){
    this.zIndex++;
    const z = this.zIndex;
    $(e.source.element.nativeElement).css('z-index', z);
  }

  onDragging( e ){
    $(e.source.element.nativeElement).css('z-index', 9000);
  }

  connectTables () {
    const self = this;
    let isDragging = false;
    let offsetX = this.offsetLineX1;
    $(document).on('mousedown', '.uml .cols', function(e) {
      if( $('body').hasClass('sidebar-lg-show') && document.documentElement.clientWidth > 992 ){
        offsetX = self.offsetLineX2;
      } else {
        offsetX = self.offsetLineX1;
      }
      isDragging = true;
      self.sourceTable = $(e.target).parents('.uml').attr('tableName');
      self.sourceCol = $(e.target).attr('colName');
      self.temporalLine = {x1: e.pageX - offsetX, y1: e.pageY - self.offsetLineY, x2: e.pageX - offsetX, y2: e.pageY - self.offsetLineY};
      e.preventDefault();
    }).on('mousemove', function (e) {
      if (isDragging) {
        self.temporalLine.x2 = e.pageX - offsetX;
        self.temporalLine.y2 = e.pageY - self.offsetLineY;
        e.preventDefault();
      }
    }).on('mouseup', function (e) {
      if(!isDragging) { return; }
      if ( ( $(e.target).hasClass('pk') || $(e.target).hasClass('unique') ) && $(e.target).parents('.uml').attr('tableName') !== self.sourceTable) {
        self.myModal.show();
        self.targetTable = $(e.target).parents('.uml').attr('tableName');
        self.targetCol = $(e.target).attr('colName');
      }
      self.temporalLine = null;
      isDragging = false;
    });
  }

  /** get x position of div of source column
   * param: source:string, target:string -> ids of the column divs */
  getX1(source:string, target:string){
    if(source === undefined || target === undefined) { return; }
    const sourceEle = $('#'+source);
    const targetEle = $('#'+target);
    if(sourceEle === undefined || targetEle === undefined) { return; }
    // if($(sourceEle).offset() === undefined || $(targetEle).offset() === undefined ) return;
    if($(sourceEle).offset().left < $(targetEle).offset().left){
      return $(sourceEle).position().left + $(sourceEle).parents('.uml').position().left + $(sourceEle).width() + this.offsetConnLeft1 -5;//-5 because no arrowhead
    }else{
      return $(sourceEle).position().left + $(sourceEle).parents('.uml').position().left + this.offsetConnLeft2 +5;//+5 because no arrowhead
    }
  }
  /** get x position of div of target column
   * param: source:string, target:string -> ids of the column divs */
  getX2(source:string, target:string){
    if(source === undefined || target === undefined) { return; }
    const sourceEle = $('#'+source);
    const targetEle = $('#'+target);
    // if($(sourceEle).offset() === undefined || $(targetEle).offset() === undefined ) return;
    if( $(sourceEle).offset().left < $(targetEle).offset().left + $(targetEle).width()/2 ){
      return $(targetEle).position().left + $(targetEle).parents('.uml').position().left + this.offsetConnLeft2;
    }else{
      return $(targetEle).position().left + $(targetEle).parents('.uml').position().left + $(targetEle).width() + this.offsetConnLeft1;
    }
  }
  /** get y position of div of source/target column
   * param: source:string, target:string -> ids of the column divs */
  getY(ele:string) {
    if (ele === undefined) { return; }
    const element = $('#' + ele);
    // if( $(element).position() === undefined ) return;
    return $(element).position().top + $(element).parents('.uml').position().top + this.offsetConnTop;
  }

  closeModal(){
    this.myModal.hide();
    this.sourceTable = null;
    this.sourceCol = null;
    this.targetTable = null;
    this.targetCol = null;
  }

  createForeignKey(){
    const fk: ForeignKey = new ForeignKey( this.constraintName, this.schema, this.sourceTable, this.sourceCol, this.targetTable, this.targetCol )
      .onUpdate( this.fkForm.value.update ).onDelete( this.fkForm.value.delete );

    this._crud.addForeignKey( fk ).subscribe(
      res => {
        this.closeModal();
        const result = <ResultSet> res;
        if( result.error ){
          this._toast.toast( 'failed', result.error, 0, 'bg-warning');
        }
        else if( result.info.affectedRows === 1) {
          this._toast.toast( 'success', 'new foreign key was created', 10, 'bg-success');
          // this.getUml();
          // this.connectTables();
          const fkTable = fk.fkTableName.substr(fk.fkTableName.indexOf('.')+1, fk.fkTableName.length);
          const pkTable = fk.pkTableName.substr(fk.pkTableName.indexOf('.')+1, fk.pkTableName.length);
          this.connections.push( { source: fk.fkTableSchema+'_'+fkTable+'_'+fk.fkColumnName, target: fk.pkTableSchema+'_'+pkTable+'_'+fk.pkColumnName } );
        }
      }, err => {
        this.closeModal();
        this._toast.toast( 'error', 'An unknown error occurred on the server', 10, 'bg-danger');
      }
    );
  }

}
