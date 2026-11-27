import {Component, OnDestroy} from '@angular/core';
import {ButtonModule, ModalModule} from '@coreui/angular';

@Component({
    selector: 'app-mapping-discard-dialog',
    standalone: true,
    imports: [ButtonModule, ModalModule],
    template: `
        <c-modal [visible]="visible" (visibleChange)="!$event && answer(false)" aria-labelledby="discard-document-mapping-title">
            <c-modal-header><h4 cModalTitle id="discard-document-mapping-title">Discard unsaved changes?</h4></c-modal-header>
            <c-modal-body>Your changes to this mapping have not been saved.</c-modal-body>
            <c-modal-footer>
                <button cButton color="light" type="button" (click)="answer(false)">Keep editing</button>
                <button cButton color="danger" type="button" (click)="answer(true)">Discard changes</button>
            </c-modal-footer>
        </c-modal>
    `
})
export class MappingDiscardDialogComponent implements OnDestroy {
    visible = false;
    private confirmation: Promise<boolean>;
    private resolveConfirmation: (discard: boolean) => void;

    confirm(): Promise<boolean> {
        if (!this.confirmation) {
            this.visible = true;
            this.confirmation = new Promise(resolve => this.resolveConfirmation = resolve);
        }
        return this.confirmation;
    }

    answer(discard: boolean) {
        this.visible = false;
        this.resolveConfirmation?.(discard);
        this.resolveConfirmation = null;
        this.confirmation = null;
    }

    ngOnDestroy() {
        this.answer(false);
    }
}
