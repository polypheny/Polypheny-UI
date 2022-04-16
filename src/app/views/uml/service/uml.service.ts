import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, map, shareReplay, startWith, switchMap, take, tap } from 'rxjs/operators';
import { ResultSet } from '../../../components/data-view/models/result-set.model';
import { LeftSidebarService } from '../../../components/left-sidebar/left-sidebar.service';
import { EditTableRequest } from '../../../models/ui-request.model';
import { CrudService } from '../../../services/crud.service';
import { DbmsTypesService } from '../../../services/dbms-types.service';
import { ForeignKey, Uml } from '../api/uml.model';

@Injectable({
  providedIn: 'root'
})
export class UmlService {

  uml$ = new Subject<Uml>();
  addForeignKeyResult$ = new Subject<[ForeignKey, ResultSet]>();
  fkActions$ = this._dbmsTypes.getFkActions().pipe(
    shareReplay(),
    tap(() => console.log('getting fkActions'))
  );

  errorMessage$ = new BehaviorSubject(null);

  private reloadProposedConstraintName = new Subject<void>();
  public proposedConstraintName$ = this.reloadProposedConstraintName.pipe(
    startWith(0),
    switchMap(() => this._crud.getGeneratedNames()),
    filter(names => !!names),
    map(names => <ResultSet>names),
    tap(names => {
      if(names.error){
        console.log(names.error);
      }
    }),
    map(names => names.data[0][1]),
    tap(n => console.log('cName pipe', n))
  );

  constructor(
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _dbmsTypes: DbmsTypesService
  ) { }

  getUml(schema: string) {
    if (!schema) {
      this.uml$.next(null);
      this._leftSidebar.reset();
      return;
    }
    this._crud.getUml(new EditTableRequest(schema)).
    pipe(take(1))
    .subscribe(
      res => {
        this.errorMessage$.next(null);
        this.uml$.next(<Uml>res);
        //this.mapConnections();//handled in component ngOnChanges
      }, err => {
        console.warn('FAilED HTTP');
        this.errorMessage$.next('Could not connect with the server.');
      }
    );
  }

  addForeignKey(schema: string, fk: ForeignKey) {
    this._crud.addForeignKey(fk).pipe(
      map(res => <ResultSet> res),
      tap(res => {
        if(res.affectedRows === 1) {
          this.getUml(schema);
        }
        this.loadProposedConstraintName();
      }),
      take(1)
    ).subscribe(res => {
      console.log('added foreign key');
      this.addForeignKeyResult$.next([fk, res])
    });
  }

  loadProposedConstraintName(){
    this.reloadProposedConstraintName.next();
  }

}
