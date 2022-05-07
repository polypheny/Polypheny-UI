import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as $ from 'jquery';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { DbColumn, ResultSet } from '../../../components/data-view/models/result-set.model';
import { ToastDuration, ToastService } from '../../../components/toast/toast.service';
import { getValidationClass, invalidNameMessage, nameIsValid } from '../../../utils/validation';
import { DbTable, ForeignKey, SvgLine, Uml } from '../api/uml.model';

@Component({
  selector: 'app-uml',
  templateUrl: './uml.component.html',
  styleUrls: ['./uml.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class UmlComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @Input()
  uml: Uml;

  @Input()
  addForeignKeyResult: [ForeignKey, ResultSet];

  @Input()
  proposedConstraintName = 'fk1';

  @Input()
  fkActions;

  @Input()
  schemaType;

  @Input()
  errorMsg: string;

  @Output()
  addForeignKey: EventEmitter<ForeignKey> = new EventEmitter<ForeignKey>();

  temporalLine: SvgLine;
  schema;
  connections = [];
  zIndex = 2;

  @ViewChild('myModal', {static: false}) myModal: ModalDirective;
  sourceTable;//schema.table
  sourceCol;
  targetTable;//schema.table
  targetCol;
  fkForm = this._formBuilder.group({update: 'RESTRICT', delete: 'RESTRICT'});
  constraintName = '';
  private subscriptions = new Subscription();


  //offsets
  offsetLineX1 = 15;
  offsetLineX2 = 220;
  offsetLineY = 150;
  offsetConnLeft1 = 21;
  offsetConnLeft2 = -5;
  offsetConnTop = 20;


  constructor(
    private _route: ActivatedRoute,
    private _formBuilder: FormBuilder,
    private _toast: ToastService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.schema = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe(params => {
      this.schema = params['id'];
    });
  }

  ngAfterViewInit() {
    this.connectTables();
  }

  ngOnChanges(changes: SimpleChanges): void {
      if(changes.uml?.currentValue) {
        this.mapConnections();
      }
      if(changes.addForeignKeyResult?.currentValue){
        this.handleAddForeignKey(
          this.addForeignKeyResult[0],
          this.addForeignKeyResult[1]
        );
      }
  }

  ngOnDestroy() {
    $(document).off();//remove event listener from connectTables() when leaving this view
    this.subscriptions.unsubscribe();
  }

  getColumnClass(table: DbTable, col: DbColumn) {
    if (table.primaryKeyFields.indexOf(col.name) > -1) {
      return 'bg-primary pk';
    } else if (table.uniqueColumns.indexOf(col.name) > -1) {
      return 'bg-warning unique';
    } else {
      return '';
    }
  }

  getUpdateDeleteActions() {
    if(this.uml && this.targetTable){
      const tableName = this.targetTable.split('.')[1];
      const table = this.uml.tables[tableName];
      if(table?.tableType === 'SOURCE'){
        return ['NONE'];
      }
    }
    return this.fkActions;
  }

  mapConnections() {
    this.connections = [];
    this.uml.foreignKeys.forEach((v, k) => {
      this.connections.push({
        source: v.sourceSchema + '_' + v.sourceTable + '_' + v.sourceColumn,
        target: v.targetSchema + '_' + v.targetTable + '_' + v.targetColumn,
      });
    });
  }

  updateZIndex(e) {
    this.zIndex++;
    const z = this.zIndex;
    $(e.source.element.nativeElement).css('z-index', z);
  }

  onDragStart(e) {  
    $(e.source.element.nativeElement).css('z-index', 9000);
  }

  onDragging(){
    this._cdr.markForCheck();
  }

  connectTables() {
    const self = this;
    let isDragging = false;
    let offsetX = this.offsetLineX1;
    $(document).on('mousedown', '.uml .cols', function (e) {
      if ($('body').hasClass('sidebar-lg-show') && document.documentElement.clientWidth > 992) {
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
        self._cdr.markForCheck();
        e.preventDefault();
      }
    }).on('mouseup', function (e) {
      if (!isDragging) {
        return;
      }
      if (($(e.target).hasClass('pk') || $(e.target).hasClass('unique')) && $(e.target).parents('.uml').attr('tableName') !== self.sourceTable) {
        self.targetTable = $(e.target).parents('.uml').attr('tableName');
        self.targetCol = $(e.target).attr('colName');
        if(self.uml){
          const tableName = self.targetTable.split('.')[1];
          const table = self.uml.tables[tableName];
          if(table?.tableType === 'SOURCE'){
            self.fkForm.controls['update'].setValue('NONE');
            self.fkForm.controls['delete'].setValue('NONE');
          } else {
            self.fkForm.controls['update'].setValue('RESTRICT');
            self.fkForm.controls['delete'].setValue('RESTRICT');
          }
        }
        self.myModal.show();
      }
      self.temporalLine = null;
      isDragging = false;
      self._cdr.markForCheck();
    });
  }

  /** get x position of div of source column
   * param: source:string, target:string -> ids of the column divs */
  getX1(source: string, target: string) {
    if (source === undefined || target === undefined) {
      return;
    }
    const sourceEle = $('#' + source);
    const targetEle = $('#' + target);
    if (sourceEle === undefined || targetEle === undefined) {
      return;
    }
    // if($(sourceEle).offset() === undefined || $(targetEle).offset() === undefined ) return;
    if ($(sourceEle).offset().left < $(targetEle).offset().left) {
      return $(sourceEle).position().left + $(sourceEle).parents('.uml').position().left + $(sourceEle).width() + this.offsetConnLeft1 - 5;//-5 because no arrowhead
    } else {
      return $(sourceEle).position().left + $(sourceEle).parents('.uml').position().left + this.offsetConnLeft2 + 5;//+5 because no arrowhead
    }
  }

  /** get x position of div of target column
   * param: source:string, target:string -> ids of the column divs */
  getX2(source: string, target: string) {
    if (source === undefined || target === undefined) {
      return;
    }
    const sourceEle = $('#' + source);
    const targetEle = $('#' + target);
    // if($(sourceEle).offset() === undefined || $(targetEle).offset() === undefined ) return;
    if ($(sourceEle).offset().left < $(targetEle).offset().left + $(targetEle).width() / 2) {
      return $(targetEle).position().left + $(targetEle).parents('.uml').position().left + this.offsetConnLeft2;
    } else {
      return $(targetEle).position().left + $(targetEle).parents('.uml').position().left + $(targetEle).width() + this.offsetConnLeft1;
    }
  }

  /** get y position of div of source/target column
   * param: source:string, target:string -> ids of the column divs */
  getY(ele: string) {
    if (ele === undefined) {
      return;
    }
    const element = $('#' + ele);
    // if( $(element).position() === undefined ) return;
    return $(element).position().top + $(element).parents('.uml').position().top + this.offsetConnTop;
  }

  closeModal() {
    this.myModal.hide();
    this.sourceTable = null;
    this.sourceCol = null;
    this.targetTable = null;
    this.targetCol = null;
  }

  createForeignKey() {
    if (!this.constraintName || this.constraintName === '') {
      this.constraintName = this.proposedConstraintName;
    }
    if (!nameIsValid(this.constraintName)) {
      this._toast.warn(invalidNameMessage('constraint'), 'invalid constraint name', ToastDuration.INFINITE);
      return;
    }
    const fk: ForeignKey = new ForeignKey(this.constraintName, this.schema, this.sourceTable, this.sourceCol, this.targetTable, this.targetCol)
      .updateAction(this.fkForm.value.update).deleteAction(this.fkForm.value.delete);

    this.addForeignKey.emit(fk);
  }

  handleAddForeignKey(fk: ForeignKey, result: ResultSet){
    this.closeModal();
    if( result.error ) {
      this._toast.exception(result, null, null, ToastDuration.INFINITE);
    }
    else if( result.affectedRows === 1 ) {
      this._toast.success('new foreign key was created', result.generatedQuery);
      // this.getUml();//handled in service
      this.connectTables();
      const fkTable = fk.sourceTable.substr(fk.sourceTable.indexOf('.') + 1, fk.sourceTable.length);
      const pkTable = fk.targetTable.substr(fk.targetTable.indexOf('.') + 1, fk.targetTable.length);
      this.connections.push({
        source: fk.sourceSchema + '_' + fkTable + '_' + fk.sourceColumn,
        target: fk.targetSchema + '_' + pkTable + '_' + fk.targetColumn
      });
      this.constraintName = '';
      //this.getGeneratedNames();//handled in service
    }
  }

  getValidationClass(name: string){
    return getValidationClass(name);
  }

}
