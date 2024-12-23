import {ChangeDetectorRef, Component, HostBinding, Input, OnChanges} from '@angular/core';
import {ClassicPreset} from 'rete';

@Component({
    selector: 'app-activity-port',
    standalone: true,
    imports: [],
    template: ``,
    styleUrl: './activity-port.component.scss'
})
export class ActivityPortComponent implements OnChanges {
    @Input() data!: ActivityPort;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        return this.data.name;
    }

    constructor(private cdr: ChangeDetectorRef) {
        this.cdr.detach();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
    }

}

export class ActivityPort extends ClassicPreset.Socket {

    constructor() {
        super('');
    }

    isCompatibleWith(socket: ActivityPort) {
        return true; // TODO: change to computation based on porttype
    }
}