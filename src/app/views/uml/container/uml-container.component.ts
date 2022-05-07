import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { LeftSidebarService } from '../../../components/left-sidebar/left-sidebar.service';
import { SchemaRequest } from '../../../models/ui-request.model';
import { CrudService } from '../../../services/crud.service';
import { UmlService } from '../service/uml.service';

@Component({
  selector: 'app-uml-container',
  template: `
    <app-uml
      [uml]="_uml.uml$ | async"
      [addForeignKeyResult]="_uml.addForeignKeyResult$ | async"
      [proposedConstraintName]="_uml.proposedConstraintName$ | async"
      [fkActions]="_uml.fkActions$ | async"
      [schemaType]="schemaType$ | async"
      [errorMsg]="_uml.errorMessage$ | async"
      (addForeignKey)="_uml.addForeignKey(schema, $event)"
    >
    </app-uml>
  `,
  styles: [
  ]
})
export class UmlContainerComponent implements OnInit, OnDestroy {

  subscriptions = new Subscription();
  
  schema: string;
  schema$ = this._route.params.pipe(
    map(params => params['id']),
    tap(schema => {
      this.schema = schema;
      this._uml.getUml(schema);
    })
  );

  schemaType$ = combineLatest([
    this.schema$.pipe(map(schema => schema?.split('.')[0])),
    //getTypeSchemas is only called once
    this._crud.getTypeSchemas()
  ]).pipe(
    filter(([schema, schemaTypes]) => !!schema),
    map(([schema, schemaTypes]) => schemaTypes[schema])
  );

  constructor(
    public _uml: UmlService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _crud: CrudService,
    private _leftSidebar: LeftSidebarService
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this._crud.onReconnection().pipe(
        filter(r => !!r),
        tap(() => this._leftSidebar.setSchema(
          new SchemaRequest('/views/uml/', false, 1, true), this._router)
        )
      ).subscribe()
    );
    this._leftSidebar.setSchema(new SchemaRequest('/views/uml/', true, 1, true), this._router);
  }

  ngOnDestroy(): void {
    this._leftSidebar.close();
    this.subscriptions.unsubscribe();
  }

}
