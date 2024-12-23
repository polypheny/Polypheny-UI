import {ChangeDetectorRef, Component, HostBinding, Input, OnChanges} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';

@Component({
    selector: 'app-activity',
    templateUrl: './activity.component.html',
    styleUrl: './activity.component.scss'
})
export class ActivityComponent implements OnChanges {
    @Input() data!: ActivityNode;
    @Input() emit!: (data: any) => void;
    @Input() rendered!: () => void;
    seed = 0;

    @HostBinding('class.selected') get selected() {
        return this.data.selected;
    }

    constructor(private cdr: ChangeDetectorRef) {
        this.cdr.detach();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
        this.seed++; // force render sockets
    }

    sortByIndex<
        N extends object,
        T extends KeyValue<string, N & { index?: number }>
    >(a: T, b: T) {
        const ai = a.value.index || 0;
        const bi = b.value.index || 0;

        return ai - bi;
    }

}

export class ActivityNode extends ClassicPreset.Node {
    width = 100;
    height = 100; // TODO: change dimensions

    constructor() {
        super('ActivityNode Sample Label');
    }
}
