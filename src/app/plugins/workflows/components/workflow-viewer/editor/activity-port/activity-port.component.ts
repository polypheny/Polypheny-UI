import {ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnChanges, OnInit} from '@angular/core';
import {ClassicPreset} from 'rete';
import {InPortDef, OutPortDef} from '../../../../models/activity-registry.model';

@Component({
    selector: 'app-activity-port',
    standalone: true,
    imports: [],
    template: ``,
    styleUrl: './activity-port.component.scss'
})
export class ActivityPortComponent implements OnInit, OnChanges {
    @Input() data!: ActivityPort;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        return this.data.name;
    }

    constructor(private cdr: ChangeDetectorRef, private elementRef: ElementRef) {
        this.cdr.detach();
    }

    ngOnInit(): void {
        if (this.data.controlType === 'success') {
            this.elementRef.nativeElement.classList.add('success-control');
        } else if (this.data.controlType === 'fail') {
            this.elementRef.nativeElement.classList.add('fail-control');
        } else if (this.data.controlType === 'in') {
            this.elementRef.nativeElement.classList.add('in-control');
        }
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
    }

}

export class ActivityPort extends ClassicPreset.Socket {


    constructor(portDef: InPortDef | OutPortDef = null, public readonly controlType: 'success' | 'fail' | 'in' | null = null) {
        super('');
    }

    isCompatibleWith(socket: ActivityPort) {
        return true; // TODO: change to computation based on porttype
    }
}
