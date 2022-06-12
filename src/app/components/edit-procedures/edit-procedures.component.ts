import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { DbProcedure } from '../../views/uml/uml.model';
import { ConfirmModalComponentComponent } from '../confirm-modal-component/confirm-modal-component.component';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-edit-procedures',
  templateUrl: './edit-procedures.component.html',
  styleUrls: ['./edit-procedures.component.scss'],
})
export class EditProceduresComponent implements OnInit {
  droppingProcedure: boolean = false;
  procedures: DbProcedure[];
  selectedProcedure: DbProcedure;
  @ViewChild(ConfirmModalComponentComponent) confirmModal:ConfirmModalComponentComponent;

  constructor(public _crud: CrudService,
    private _toast: ToastService,) { }

  ngOnInit(): void {
    this.getProcedures();
  }

  onReconnect() {
    this.getProcedures();
  }

  confirmEventHandler(event:any) {
     this.dropProcedure(this.selectedProcedure);
  }

  confirmAction(procedure: DbProcedure) {
    this.selectedProcedure = procedure;
    this.confirmModal.openModal();
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
    this._crud.deleteProcedure(procedure.name).subscribe(
      result => {
        this.droppingProcedure = false;
        this.getProcedures();
      }, err => {
        this._toast.error('could not update queryInterface settings');
        console.log(err);
      }
    );
  }

}
