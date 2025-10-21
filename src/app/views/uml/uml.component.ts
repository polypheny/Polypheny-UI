import {AfterViewInit, Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {ActivatedRoute, Router} from '@angular/router';
import {CrudService} from '../../services/crud.service';
import {DataModel, EditTableRequest} from '../../models/ui-request.model';
import {DbTable, ForeignKey, SvgLine, Uml} from './uml.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {UntypedFormBuilder} from '@angular/forms';
import {ToastDuration, ToasterService} from '../../components/toast-exposer/toaster.service';
import {RelationalResult, UiColumnDefinition} from '../../components/data-view/models/result-set.model';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {Subscription} from 'rxjs';
import {ModalComponent} from '@coreui/angular';

@Component({
    selector: 'app-uml',
    templateUrl: './uml.component.html',
    styleUrls: ['./uml.component.scss'],
    standalone: false
})

export class UmlComponent implements OnInit, AfterViewInit, OnDestroy {

    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    public readonly _crud = inject(CrudService);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _formBuilder = inject(UntypedFormBuilder);
    private readonly _toast = inject(ToasterService);
    private readonly _dbmsTypes = inject(DbmsTypesService);

    uml: Uml;
    temporalLine: SvgLine;
    schema;
    connections = [];
    zIndex = 2;
    errorMsg: string;
    types: {};

    @ViewChild('myModal', {static: false}) myModal: ModalComponent;
    sourceTable;//schema.table
    sourceCol;
    targetTable;//schema.table
    targetCol;
    fkActions;
    fkForm = this._formBuilder.group({update: 'RESTRICT', delete: 'RESTRICT'});
    constraintName = '';
    proposedConstraintName = 'fk1';
    private subscriptions = new Subscription();


    //offsets
    offsetLineX1 = 15;
    offsetLineX2 = 220;
    offsetLineY = 150;
    offsetConnLeft1 = 21;
    offsetConnLeft2 = -5;
    offsetConnTop = 20;
    schemaType = '';


    constructor() {
        this._dbmsTypes.getFkActions().subscribe(
            types => {
                this.fkActions = types;
            }
        );
    }

    ngOnInit() {
        this.schema = this._route.snapshot.paramMap.get('id');
        this._crud.getTypeSchemas().subscribe(res => {
            this.types = res;
        });
        this._route.params.subscribe(params => {
            this.schema = params['id'];
            console.log(this.types);
            if (this.types && this.types.hasOwnProperty(this.schema)) {
                this.schemaType = this.types[this.schema];
            }
            this.getUml();
        });
        const sub = this._crud.onReconnection().subscribe(
            b => {
                if (b) {
                    this._leftSidebar.setSchema(this._router, '/views/uml/', false, 1, true, false, [DataModel.RELATIONAL]);
                }
            }
        );
        this.subscriptions.add(sub);
        this._leftSidebar.setSchema(this._router, '/views/uml/', true, 1, true, false, [DataModel.RELATIONAL]);
    }

    ngAfterViewInit() {
        this.getUml();
        this.connectTables();
        this.getGeneratedNames();
    }

    ngOnDestroy() {
        $(document).off();//remove event listener from connectTables() when leaving this view
        this._leftSidebar.close();
        this.subscriptions.unsubscribe();
    }

    getUml() {
        if (!this.schema) {
            this.uml = null;
            this._leftSidebar.reset();
            return;
        }
        this._crud.getUml(new EditTableRequest(this.schema)).subscribe({
            next: (uml: Uml) => {
                this.errorMsg = null;
                this.uml = new Uml(uml.tables, uml.foreignKeys);
                this.mapConnections();
            }, error: err => {
                this.errorMsg = 'Could not connect with the server.';
            }
        });
    }

    getGeneratedNames() {
        this._crud.getGeneratedNames().subscribe({
            next: res => {
                const names = <RelationalResult>res;
                if (!names.error) {
                    this.proposedConstraintName = names.data[0][1];
                } else {
                    console.log(names.error);
                }
            }, error: err => {
                console.log(err);
            }
        });
    }

    getColumnClass(table: DbTable, col: UiColumnDefinition) {
        if (table.primaryKeyFields.indexOf(col.name) > -1) {
            return 'bg-primary pk';
        } else if (table.uniqueColumns.indexOf(col.name) > -1) {
            return 'bg-warning unique';
        } else {
            return '';
        }
    }

    getUpdateDeleteActions() {
        if (this.uml && this.targetTable) {
            const tableName = this.targetTable.split('.')[1];
            const table = this.uml.tables[tableName];
            if (table?.tableType === 'SOURCE') {
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

    onDragging(e) {
        $(e.source.element.nativeElement).css('z-index', 9000);
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
            self.temporalLine = {
                x1: e.pageX - offsetX,
                y1: e.pageY - self.offsetLineY,
                x2: e.pageX - offsetX,
                y2: e.pageY - self.offsetLineY
            };
            e.preventDefault();
        }).on('mousemove', function (e) {
            if (isDragging) {
                self.temporalLine.x2 = e.pageX - offsetX;
                self.temporalLine.y2 = e.pageY - self.offsetLineY;
                e.preventDefault();
            }
        }).on('mouseup', function (e) {
            if (!isDragging) {
                return;
            }
            if (($(e.target).hasClass('pk') || $(e.target).hasClass('unique')) && $(e.target).parents('.uml').attr('tableName') !== self.sourceTable) {
                self.targetTable = $(e.target).parents('.uml').attr('tableName');
                self.targetCol = $(e.target).attr('colName');
                if (self.uml) {
                    const tableName = self.targetTable.split('.')[1];
                    const table = self.uml.tables[tableName];
                    if (table?.tableType === 'SOURCE') {
                        self.fkForm.controls['update'].setValue('NONE');
                        self.fkForm.controls['delete'].setValue('NONE');
                    } else {
                        self.fkForm.controls['update'].setValue('RESTRICT');
                        self.fkForm.controls['delete'].setValue('RESTRICT');
                    }
                }
                self.myModal.visible = true;
            }
            self.temporalLine = null;
            isDragging = false;
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
        this.myModal.visible = false;
        this.sourceTable = null;
        this.sourceCol = null;
        this.targetTable = null;
        this.targetCol = null;
    }

    createForeignKey() {
        if (!this.constraintName || this.constraintName === '') {
            this.constraintName = this.proposedConstraintName;
        }
        if (!this._crud.nameIsValid(this.constraintName)) {
            this._toast.warn(this._crud.invalidNameMessage('constraint'), 'invalid constraint name', ToastDuration.INFINITE);
            return;
        }
        const fk: ForeignKey = new ForeignKey(-1, this.constraintName, this.schema, this.sourceTable, this.sourceCol, this.targetTable, this.targetCol)
            .updateAction(this.fkForm.value.update).deleteAction(this.fkForm.value.delete);

        this._crud.createForeignKey(fk).subscribe({
            next: res => {
                this.closeModal();
                const result = <RelationalResult>res;
                if (result.error) {
                    this._toast.exception(result, null, null, ToastDuration.INFINITE);
                } else if (result.affectedTuples === 1) {
                    this._toast.success('new foreign key was created', result.query);
                    // this.getUml();
                    // this.connectTables();
                    const fkTable = fk.sourceTable.substr(fk.sourceTable.indexOf('.') + 1, fk.sourceTable.length);
                    const pkTable = fk.targetTable.substr(fk.targetTable.indexOf('.') + 1, fk.targetTable.length);
                    this.connections.push({
                        source: fk.sourceSchema + '_' + fkTable + '_' + fk.sourceColumn,
                        target: fk.targetSchema + '_' + pkTable + '_' + fk.targetColumn
                    });
                    this.constraintName = '';
                    this.getGeneratedNames();
                }
            }, error: err => {
                this.closeModal();
                this._toast.error('An unknown error occurred on the server');
            }
        });
    }

}
