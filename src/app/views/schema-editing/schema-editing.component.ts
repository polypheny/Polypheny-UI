import {Component, computed, effect, OnDestroy, OnInit, signal, Signal, untracked, WritableSignal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../services/crud.service';
import {Namespace, NamespaceType} from '../../models/ui-request.model';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {RelationalResult} from '../../components/data-view/models/result-set.model';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {CatalogService} from '../../services/catalog.service';
import {NamespaceModel} from '../../models/catalog.model';
import {filter, map} from 'rxjs/operators';
import {AdapterModel} from '../adapters/adapter.model';

@Component({
  selector: 'app-schema-editing',
  templateUrl: './schema-editing.component.html',
  styleUrls: ['./schema-editing.component.scss']
})
export class SchemaEditingComponent implements OnInit, OnDestroy {

  constructor(
      private _route: ActivatedRoute,
      private _router: Router,
      private _leftSidebar: LeftSidebarService,
      private _breadcrumb: BreadcrumbService,
      private _crud: CrudService,
      private _toast: ToasterService,
      private _catalog: CatalogService
  ) {
    this._route.params.subscribe(route => {
      this.currentRoute.set(route['id']);
    });
    this.namespace = computed(() => {
      const catalog = this._catalog.listener();
      const route = this.currentRoute();
      if (!route) {
        return this.namespace();
      }
      const namespaceName = route.split('\.')[0];
      return this._catalog.getNamespaceFromName(namespaceName);
    });

    this.namespaces = computed(() => {
      const catalog = this._catalog.listener();
      return this._catalog.getNamespaces();
    });

    this.stores = computed(() => {
      const catalog = this._catalog.listener();
      return catalog.getStores();
    });

    effect(() => {
      const catalog = this._catalog.listener();
      untracked(() => {
        this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false, true);
      });

    });
  }

  readonly currentRoute: WritableSignal<string> = signal(this._route.snapshot.paramMap.get('id'));//either the name of a table (schemaName.tableName) or of a schema (schemaName)
  readonly namespace: Signal<NamespaceModel>;

  createForm: UntypedFormGroup;
  dropForm: UntypedFormGroup;
  namespaces: Signal<NamespaceModel[]>;
  createSubmitted = false;
  dropSubmitted = false;
  createNamespaceFeedback = 'Name is invalid';
  private subscriptions = new Subscription();
  readonly stores: Signal<AdapterModel[]>;
  graphStore: string;

  public readonly NamespaceType = NamespaceType;

  ngOnInit() {
    //this.getSchema();
    this.initForms();
    this._route.params.subscribe((ev) => {
      this.setBreadCrumb();
    });
    const sub = this._crud.onReconnection().subscribe(
        b => {
          this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false, true);
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

  public getSchema() {
    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false, true);
  }


  initForms() {
    this.createForm = new UntypedFormGroup({
      name: new UntypedFormControl('', this._crud.getNameValidator(true)),
      type: new UntypedFormControl('relational', Validators.required),
      stores: new UntypedFormControl('hsqldb'),
    });
    this.dropForm = new UntypedFormGroup({
      name: new UntypedFormControl('', Validators.required),
      cascade: new UntypedFormControl()
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

  createNamespace() {
    if (this.createForm.valid && this.createNamespaceValidation(this.createForm.controls['name'].value) === 'is-valid') {
      const val = this.createForm.value;
      if (val.name.trim() === '') {
        return;
      }

      this.createSubmitted = true;
      this._crud.createOrDropNamespace(new Namespace(val.name, NamespaceType[val.type.toUpperCase()], val.stores).setCreate(true)).subscribe({
        next: (res: RelationalResult) => {
          if (res.error) {
            this._toast.exception(res);
          } else {
            this._toast.success('Created namespace ' + val.name);
            //this.getSchema();
          }
          this.resetForm('createForm');
        }, error: err => {
          this._toast.error('An unknown error occurred on the server');
        }
      }).add(() => this.createSubmitted = false);
    } else {
      this._toast.warn(this.createNamespaceFeedback, 'cannot create');
    }
  }

  dropNamespace() {
    if (this.dropForm.valid && this.getValidationClass(this.dropForm.controls['name'].value) === 'is-valid') {
      const val = this.dropForm.value;
      this.dropSubmitted = true;
      this._crud.createOrDropNamespace(new Namespace(val.name, val.type, this.graphStore).setDrop(true).setCascade(val.cascade)).subscribe({
        next: (res: RelationalResult) => {
          if (res.error) {
            this._toast.exception(res);
          } else {
            this._toast.success('Dropped namespace ' + val.name);
            //this.getSchema();
          }
          this.resetForm('dropForm');
        }, error: err => {
          this._toast.error('An unknown error occurred on the server');
        }
      }).add(() => this.dropSubmitted = false);
    } else {
      this._toast.warn('This namespace does not exist', 'cannot drop');
    }
  }

  getValidationClass(val) {
    if (val === '') {
      return '';
    } else if (this.namespaces().filter((o) => o.name === val).length > 0) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  createNamespaceValidation(name) {
    if (name === '') {
      return '';
    }
    if (this.namespaces) {
      if (this.namespaces().filter((o) => o.name === name).length > 0) {
        this.createNamespaceFeedback = 'Namespace name is already taken';
        return 'is-invalid';
      } else {
        this.createNamespaceFeedback = 'Namespace name is invalid';
      }
    }
    const regex = this._crud.getNamespaceValidationRegex();
    if (regex.test(name) && name.length <= 100) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  isStatistic() {
    return this._router.url.includes('statistics');
  }

}
