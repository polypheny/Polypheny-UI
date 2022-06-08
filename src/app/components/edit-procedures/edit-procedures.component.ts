import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { DbProcedure } from '../../views/uml/uml.model';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-edit-procedures',
  templateUrl: './edit-procedures.component.html',
  styleUrls: ['./edit-procedures.component.scss']
})
export class EditProceduresComponent implements OnInit {
  private droppingProcedure: boolean = false;
  procedures: DbProcedure[];

  constructor(public _crud: CrudService,
    private _route: ActivatedRoute,
    private _toast: ToastService,) { }

  ngOnInit(): void {
    this.getProcedures();
  }

  onReconnect() {
    this.getProcedures();
  }

  getProcedures() {
    this._crud.getProcedures().subscribe(
      res => {
        const result = <DbProcedure[]>res;
        this.procedures = result;
      }, err => {
        this._toast.error('could not retrieve list of procedures');
        console.log(err);
      }
    );
  }

  dropProcedure(procedure: DbProcedure) {
    this.droppingProcedure = true;
    console.log('Dropping procedure ' + procedure.name);
    this.droppingProcedure = false;
  }

}
