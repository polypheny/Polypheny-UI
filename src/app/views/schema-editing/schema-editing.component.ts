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
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {Store} from '../adapters/adapter.model';

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
    createSchemaFeedback = 'Schema namespace is invalid';
    private subscriptions = new Subscription();
    schemaType: any;
    stores: Store[];
    graphStore: string;

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _leftSidebar: LeftSidebarService,
        private _breadcrumb: BreadcrumbService,
        private _crud: CrudService,
        private _toast: ToastService
    ) {
    }

    ngOnInit() {
        this.getRouteParam();
        this.getSchema();
        this.initForms();
        this.getStores();
        this._route.params.subscribe((ev) => {
            this.getSchemaType();
            this.setBreadCrumb();
        });
        const sub = this._crud.onReconnection().subscribe(
            b => {
                this._leftSidebar.setSchema(new SchemaRequest('/views/schema-editing/', true, 2, false, true), this._router);
            }
        );
        this.subscriptions.add(sub);
    }

    setBreadCrumb() {
        const url = this._router.url.replace('/views/schema-editing/', '');
        if (url.length <= 0) {
            this._breadcrumb.setBreadcrumbsSchema([new BreadcrumbItem('Schema')], null);
        } else if (url.includes('statistics-column')) {
            const colName = url.replace('/statistics-column', '').split('.')[url.replace('/statistics-column', '').split('.').length - 1];
            this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Schema', '/views/schema-editing/'), new BreadcrumbItem(url.split('.')[0], this._router.url.split('.')[0]), new BreadcrumbItem(colName, this._router.url.replace('/statistics-column', '')), new BreadcrumbItem('statistics')]);
        } else if (!url.includes('.')) {
            this._breadcrumb.setBreadcrumbsSchema([new BreadcrumbItem('Schema', '/views/schema-editing/'), new BreadcrumbItem(url)], null);
        } else {
            this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Schema', '/views/schema-editing/'), new BreadcrumbItem(url.split('.')[0], this._router.url.split('.')[0]), new BreadcrumbItem(url.split('.')[url.split('.').length - 1])]);
        }
    }

    ngOnDestroy() {
        this._leftSidebar.close();
        this.subscriptions.unsubscribe();
        this._breadcrumb.hide();
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
        if (!this.routeParam) {
            return;
        }
        const schema = this.routeParam.split('.')[0];
        this._crud.getTypeSchemas().subscribe(
            res => {
                this.schemaType = res[schema];
                this._leftSidebar.schemaType = res[schema];
            }, error => {
                console.log(error);
            }
        );
    }

    initForms() {
        this.createForm = new FormGroup({
            name: new FormControl('', this._crud.getNameValidator(true)),
            type: new FormControl('relational', Validators.required),
            stores: new FormControl('hsqldb'),
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
            this._crud.createOrDropSchema(new Schema(val.name, val.type, this.graphStore).setCreate(true)).subscribe(
                res => {
                    const result = <ResultSet>res;
                    if (result.error) {
                        this._toast.exception(result);
                    } else {
                        this._toast.success('Created namespace ' + val.name);
                        this.getSchema();
                    }
                    this.resetForm('createForm');
                }, err => {
                    this._toast.error('An unknown error occurred on the server');
                }
            ).add(() => this.createSubmitted = false);
        } else {
            this._toast.warn(this.createSchemaFeedback, 'cannot create');
        }
    }

    dropSchema() {
        if (this.dropForm.valid && this.getValidationClass(this.dropForm.controls['name'].value) === 'is-valid') {
            const val = this.dropForm.value;
            this.dropSubmitted = true;
            this._crud.createOrDropSchema(new Schema(val.name, val.type, this.graphStore).setDrop(true).setCascade(val.cascade)).subscribe(
                res => {
                    const result = <ResultSet>res;
                    if (result.error) {
                        this._toast.exception(result);
                    } else {
                        this._toast.success('Dropped namespace ' + val.name);
                        this.getSchema();
                    }
                    this.resetForm('dropForm');
                }, err => {
                    this._toast.error('An unknown error occurred on the server');
                }
            ).add(() => this.dropSubmitted = false);
        } else {
            this._toast.warn('This namespace does not exist', 'cannot drop');
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
                this.createSchemaFeedback = 'Namespace name is already taken';
                return 'is-invalid';
            } else {
                this.createSchemaFeedback = 'Namespace name is invalid';
            }
        }
        const regex = this._crud.getNamespaceValidationRegex();
        if (regex.test(name) && name.length <= 100) {
            return 'is-valid';
        } else {
            return 'is-invalid';
        }
    }

    getStores() {
        this._crud.getStores().subscribe(
            res => {
                this.stores = <Store[]>res;
            }, err => {
                console.log(err);
            });
    }

    isStatistic() {
        return this._router.url.includes('statistics');
    }
}
