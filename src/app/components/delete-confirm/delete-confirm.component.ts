import {Component, EventEmitter, OnInit, Output} from '@angular/core';

@Component({
    selector: 'app-delete-confirm',
    templateUrl: './delete-confirm.component.html',
    styleUrls: ['./delete-confirm.component.scss']
})
export class DeleteConfirmComponent implements OnInit {

    @Output() delete: EventEmitter<void> = new EventEmitter();
    confirm = false;

    constructor() {
    }

    ngOnInit(): void {
    }

    onClick() {
        if (!this.confirm) {
            this.confirm = true;
        } else {
            this.delete.emit();
        }
    }

}
