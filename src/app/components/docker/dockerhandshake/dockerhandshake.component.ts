import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {HandshakeInfo} from '../../../models/docker.model';
import {UtilService} from '../../../services/util.service';

@Component({
    selector: 'app-dockerhandshake',
    templateUrl: './dockerhandshake.component.html',
    styleUrls: ['./dockerhandshake.component.scss'],
    standalone: false
})
export class DockerhandshakeComponent implements OnInit {

    public readonly _util = inject(UtilService);

    @Input() handshake: HandshakeInfo;
    @Output() cancel = new EventEmitter<void>();
    @Output() redo = new EventEmitter<void>();

    constructor() {
    }

    ngOnInit(): void {
    }

    redoHandshake(): void {
        this.redo.emit();
    }

    cancelHandshake(): void {
        this.cancel.emit();
    }
}
