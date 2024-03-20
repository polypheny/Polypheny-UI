import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {Handshake} from '../../../models/docker.model';
import {UtilService} from '../../../services/util.service';

@Component({
    selector: 'app-dockerhandshake',
    templateUrl: './dockerhandshake.component.html',
    styleUrls: ['./dockerhandshake.component.scss']
})
export class DockerhandshakeComponent implements OnInit {

    public readonly _util = inject(UtilService);

    @Input() handshake: Handshake;
    @Output() cancel = new EventEmitter<void>();
    @Output() redo = new EventEmitter<void>();

    constructor() {
    }

    ngOnInit(): void {
    }

    cancelHandshake() {
        this.cancel.emit();
    }

    redoHandshake() {
        this.redo.emit();
    }
}
