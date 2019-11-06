import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../services/crud.service';
import {Schema, SchemaRequest} from '../../models/ui-request.model';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {SidebarNode} from '../../models/sidebar-node.model';
import {ResultSet} from '../../components/data-table/models/result-set.model';
import {ToastService} from '../../components/toast/toast.service';

@Component({
  selector: 'app-schema-editing',
  templateUrl: './schema-editing.component.html',
  styleUrls: ['./schema-editing.component.scss']
})
export class SchemaEditingComponent implements OnInit, OnDestroy {

  routeParam: string;//either the name of a table (schemaName.tableName) or of a schema (schemaName)
  createForm: FormGroup;
  dropForm: FormGroup;
  schemas: SidebarNode[];
  createSubmitted = false;
  dropSubmitted = false;

  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _toast: ToastService
  ) { }

  ngOnInit() {

    this.getRouteParam();
    this.getSchema();
    this.initForms();

  }

  ngOnDestroy() {
    this._leftSidebar.close();
  }

  getRouteParam () {
    this.routeParam = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.routeParam = params['id'];
    });
  }

  public getSchema () {
    this._leftSidebar.setSchema( new SchemaRequest('/views/schema-editing/', false, 2) );
    this._crud.getSchema(new SchemaRequest('/views/schema-editing/', false, 1)).subscribe(
      res => {
        this.schemas = <SidebarNode[]> res;
      }, err => {
        console.log(err);
      }
    );
  }

  initForms(){
    this.createForm = new FormGroup({
      name: new FormControl('', this._crud.getNameValidator( true ) ),
      ifNotExists: new FormControl(true),
      type: new FormControl('relational', Validators.required)
    });
    this.dropForm = new FormGroup({
      name: new FormControl('', Validators.required),
      exists: new FormControl(true),
      cascade: new FormControl()
    });
  }

  resetForm ( formName: string ) {
    switch ( formName ) {
      case 'createForm':
        this.createForm.controls['name'].setValue('');
        this.createForm.markAsPristine();
        break;
      case 'dropForm':
        this.dropForm.controls['name'].setValue('');
        this.dropForm.controls['cascade'].setValue(false);
        this.dropForm.markAsPristine();
        break;
    }
  }

  createSchema(){
    this.createSubmitted = true;
    if( this.createForm.valid ){
      const val = this.createForm.value;
      this._crud.createOrDropSchema( new Schema( val.name, val.type ).setCreate( true ).setIfNotExists( val.ifNotExists ) ).subscribe(
        res => {
          const result = <ResultSet> res;
          if( result.error ){
            this._toast.toast( 'error', result.error, 10, 'bg-warning');
          }else{
            this._toast.toast( 'success', 'Created schema ' + val.name, 10, 'bg-success');
            this.getSchema();
          }
          this.createSubmitted = false;
          this.resetForm('createForm');
        }, err => {
          this._toast.toast( 'server error', 'An unknown error occured on the server', 10, 'bg-danger');
        }
      );
    } else {
      this._toast.toast( 'invalid name', this._crud.invalidNameMessage('schema'), 10, 'bg-warning');
    }
  }

  dropSchema(){
    this.dropSubmitted = true;
    if( this.dropForm.valid ){
      const val = this.dropForm.value;
      this._crud.createOrDropSchema( new Schema( val.name, val.type ).setDrop( true ).setIfExists( val.ifExists ).setCascade( val.cascade ) ).subscribe(
        res => {
          const result = <ResultSet> res;
          if( result.error ){
            this._toast.toast( 'error', result.error, 10, 'bg-warning');
          }else{
            this._toast.toast( 'success', 'Dropped schema ' + val.name, 10, 'bg-success');
            this.getSchema();
          }
          this.dropSubmitted = false;
          this.resetForm('dropForm');
        }, err => {
          this._toast.toast( 'server error', 'An unknown error occured on the server', 10, 'bg-danger');
        }
      );
    }

  }

  getValidationClass( val ){
    if( val === '' ){
      return '';
    } else if ( this.schemas.filter( (o) => o.name === val ).length > 0 ){
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

}
