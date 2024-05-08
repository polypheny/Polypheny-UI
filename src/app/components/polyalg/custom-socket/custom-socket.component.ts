import {ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnChanges, OnInit} from '@angular/core';
import {ClassicPreset} from 'rete';
import {DataModel} from '../../../models/ui-request.model';

@Component({
    selector: 'app-custom-socket',
    template: ``,
    styleUrl: './custom-socket.component.scss'
})
export class CustomSocketComponent implements OnInit, OnChanges {
    @Input() data!: AlgNodeSocket;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        return this.data.name;
    }

    constructor(private cdr: ChangeDetectorRef, private elementRef: ElementRef) {
        this.cdr.detach();
    }

    ngOnInit(): void {
        if (this.data.isMultiValued) {
            this.elementRef.nativeElement.classList.add('multi');
        }

    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
    }

}

export class AlgNodeSocket extends ClassicPreset.Socket {

    /**
     *
     * @param dataModel the DataModel this socket expects or null if it does not matter
     * @param isMultiValued true if this socket supports multiple incoming connections
     */
    constructor(public readonly dataModel: DataModel | null, public readonly isMultiValued = false) {
        super('AlgNodeSocket');
    }

    isCompatibleWith(socket: AlgNodeSocket) {
        return socket.dataModel === this.dataModel || socket.dataModel === null;
    }
}
