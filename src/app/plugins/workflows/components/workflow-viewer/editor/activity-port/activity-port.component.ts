import {ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnChanges, OnInit, signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {InPortDef, OutPortDef, portTypeToDataModel} from '../../../../models/activity-registry.model';
import {DataModel} from '../../../../../../models/ui-request.model';
import {NgClass, NgIf} from '@angular/common';

@Component({
    selector: 'app-activity-port',
    standalone: true,
    imports: [
        NgIf,
        NgClass
    ],
    // TODO: render datamodel in activity itself
    template: `<p *ngIf="!data.isControl" class="text-primary" [ngClass]="data.isInput ? 'ms-3' : 'output-datamodel'">{{data.dataModel().slice( 0, 3 )}}</p>`,
    styleUrl: './activity-port.component.scss'
})
export class ActivityPortComponent implements OnInit, OnChanges {
    @Input() data!: ActivityPort;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        return this.data.dataModel;
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
    public readonly isControl: boolean;
    public readonly dataModel = signal<DataModel>(null); // TODO: track data model state in workflow itself

    constructor(public readonly portDef: InPortDef | OutPortDef, public readonly isInput: boolean, public readonly controlType: 'success' | 'fail' | 'in' | null = null) {
        super('');
        this.isControl = controlType != null;
        if (!this.isControl) {
            this.dataModel.set(portTypeToDataModel(portDef.type));
        }
    }

    isCompatibleWith(target: ActivityPort) {
        if (this.isControl) {
            return target.isControl;
        }

        return !target.isControl && (this.dataModel() === target.dataModel() || !this.dataModel() || !target.dataModel());

    }
}
