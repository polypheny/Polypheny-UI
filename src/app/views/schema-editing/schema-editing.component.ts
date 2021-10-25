import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../services/crud.service';
import {Schema, SchemaRequest} from '../../models/ui-request.model';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {SidebarNode} from '../../models/sidebar-node.model';
import {ResultSet} from '../../components/data-view/models/result-set.model';
import {ToastService} from '../../components/toast/toast.service';
import {Subscription} from 'rxjs';

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
  createSchemaFeedback = 'Schema name is invalid';
  private subscriptions = new Subscription();
  schemaType: any;

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _toast: ToastService
  ) { }

  ngOnInit() {

    this.getRouteParam();
    this.getSchema();
    this.initForms();
    this._route.params.subscribe((ev) => {
      this.getSchemaType();
    });

    const sub = this._crud.onReconnection().subscribe(
      b => {
        this._leftSidebar.setSchema(new SchemaRequest('/views/schema-editing/', true, 2,false, true), this._router);
      }
    );
    this.subscriptions.add(sub);
  }

  ngOnDestroy() {
    this._leftSidebar.close();
    this.subscriptions.unsubscribe();
  }

  getRouteParam() {
    this.routeParam = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.routeParam = params['id'];
    });
  }

  public getSchema() {
    this._leftSidebar.setSchema(new SchemaRequest('/views/schema-editing/', true, 2, false, true), this._router);
    this._crud.getSchema(new SchemaRequest('/views/schema-editing/', true, 2, false, true)).subscribe(
      res => {
        this.schemas = <SidebarNode[]>res;
      }, err => {
        console.log(err);
      }
    );
  }

  getSchemaType() {
    if ( !this.routeParam ) {
      return;
    }
    const schema = this.routeParam.split('.')[0];
    this._crud.getTypeSchemas().subscribe(
        res => {
          this.schemaType = res[schema];
          this._leftSidebar.schemaType = res[schema];
          console.log('received');
        }, error => {
          console.log(error);
        }
    );
  }

  initForms() {
    this.createForm = new FormGroup({
      name: new FormControl('', this._crud.getNameValidator(true)),
      type: new FormControl('relational', Validators.required)
    });
    this.dropForm = new FormGroup({
      name: new FormControl('', Validators.required),
      cascade: new FormControl()
    });
  }

  resetForm(formName: string) {
    switch (formName) {
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

  createSchema() {
    if (this.createForm.valid && this.createSchemaValidation(this.createForm.controls['name'].value) === 'is-valid') {
      const val = this.createForm.value;
      this.createSubmitted = true;
      this._crud.createOrDropSchema(new Schema(val.name, val.type).setCreate(true)).subscribe(
        res => {
          const result = <ResultSet>res;
          if (result.error) {
            this._toast.exception(result);
          } else {
            this._toast.success('Created schema ' + val.name);
            this.getSchema();
          }
          this.resetForm('createForm');
        }, err => {
          this._toast.error('An unknown error occurred on the server');
        }
      ).add( () => this.createSubmitted = false );
    } else {
      this._toast.warn(this.createSchemaFeedback, 'cannot create');
    }
  }

  dropSchema() {
    if (this.dropForm.valid && this.getValidationClass(this.dropForm.controls['name'].value) === 'is-valid') {
      const val = this.dropForm.value;
      this.dropSubmitted = true;
      this._crud.createOrDropSchema(new Schema(val.name, val.type).setDrop(true).setCascade(val.cascade)).subscribe(
        res => {
          const result = <ResultSet>res;
          if (result.error) {
            this._toast.exception(result);
          } else {
            this._toast.success('Dropped schema ' + val.name);
            this.getSchema();
          }
          this.resetForm('dropForm');
        }, err => {
          this._toast.error('An unknown error occurred on the server');
        }
      ).add( () => this.dropSubmitted = false );
    } else {
      this._toast.warn('This schema does not exist', 'cannot drop');
    }

  }

  getValidationClass(val) {
    if (val === '') {
      return '';
    } else if (this.schemas.filter((o) => o.name === val).length > 0) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  createSchemaValidation(name) {
    if (name === '') {
      return '';
    }
    if (this.schemas) {
      if (this.schemas.filter((o) => o.name === name).length > 0) {
        this.createSchemaFeedback = 'Schema name is already taken';
        return 'is-invalid';
      } else {
        this.createSchemaFeedback = 'Schema name is invalid';
      }
    }
    const regex = this._crud.getValidationRegex();
    if (regex.test(name) && name.length <= 100) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

}
