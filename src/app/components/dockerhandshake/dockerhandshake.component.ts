import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Handshake} from '../../models/docker.model';
import {UtilService} from '../../services/util.service';

@Component({
    selector: 'app-dockerhandshake',
    templateUrl: './dockerhandshake.component.html',
    styleUrls: ['./dockerhandshake.component.scss']
})
export class DockerhandshakeComponent implements OnInit {

    @Input() handshake: Handshake;
    @Output() cancel = new EventEmitter<void>();
    @Output() redo = new EventEmitter<void>();

    constructor(
        private _util: UtilService,
    ) { }

    ngOnInit(): void {
    }

    cancelHandshake() {
        this.cancel.emit();
    }

    redoHandshake() {
        this.redo.emit();
    }
}
