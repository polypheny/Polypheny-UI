import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-confirm-modal-component',
  templateUrl: './confirm-modal-component.component.html',
  styleUrls: ['./confirm-modal-component.component.scss']
})
export class ConfirmModalComponentComponent {
modalRef: BsModalRef;
message: string;
constructor(private modalService: BsModalService) {}
  @Output() confirmedClicked: EventEmitter<void> = new EventEmitter();
  @ViewChild('confirmModalTemplate') formModal: TemplateRef<any>;
  //@Input() dialogText: string;
//  @Input() denyText: string = "No";
//  @Input() confirmText: string = "Yes";

  public openModal() {
    this.modalRef = this.modalService.show(this.formModal, {class: 'modal-sm'});
  }

  confirm(): void {
    this.modalRef.hide();
    this.confirmedClicked.emit();

  }

  decline(): void {
    this.modalRef.hide();
  }
}
