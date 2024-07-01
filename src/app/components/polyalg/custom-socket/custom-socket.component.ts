import {ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnChanges, OnInit} from '@angular/core';
import {ClassicPreset} from 'rete';
import {OperatorModel} from '../models/polyalg-registry';

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
     * @param model the OperatorModel this socket expects
     * @param isMultiValued true if this socket supports multiple incoming connections
     */
    constructor(public readonly model: OperatorModel | null, public readonly isMultiValued = false) {
        super(isMultiValued ? 'multi-valued input' : '');
    }

    isCompatibleWith(socket: AlgNodeSocket) {
        return socket.model === this.model ||
            socket.model === OperatorModel.COMMON ||
            this.model === OperatorModel.COMMON;
    }
}
