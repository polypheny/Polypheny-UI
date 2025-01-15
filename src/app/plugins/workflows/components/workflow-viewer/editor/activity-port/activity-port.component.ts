import {ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnChanges, OnInit, signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {InPortDef, OutPortDef, portTypeToDataModel} from '../../../../models/activity-registry.model';
import {DataModel} from '../../../../../../models/ui-request.model';

@Component({
    selector: 'app-activity-port',
    standalone: true,
    imports: [],
    templateUrl: './activity-port.component.html',
    styleUrl: './activity-port.component.scss'
})
export class ActivityPortComponent implements OnInit, OnChanges {
    @Input() data!: ActivityPort;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        if (this.data.isControl) {
            return this.data.controlType + ' control';
        }
        return this.data.dataModel();
    }

    constructor(private cdr: ChangeDetectorRef, private elementRef: ElementRef) {
        this.cdr.detach();
    }

    ngOnInit(): void {
        if (this.data.controlType === 'success') {
            this.elementRef.nativeElement.classList.add('success-control', 'control-port');
        } else if (this.data.controlType === 'fail') {
            this.elementRef.nativeElement.classList.add('fail-control', 'control-port');
        } else if (this.data.controlType === 'in') {
            this.elementRef.nativeElement.classList.add('in-control', 'control-port');
        } else {
            this.elementRef.nativeElement.classList.add('data-port');
            if (this.data.portDef['isOptional']) {
                this.elementRef.nativeElement.classList.add('is-optional');
            }
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
