import {ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnChanges, Signal, signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {InPortDef, OutPortDef, portTypeToDataModel} from '../../../../models/activity-registry.model';
import {DataModel} from '../../../../../../models/ui-request.model';
import {ActivityState} from '../../../../models/workflows.model';
import {NgClass} from '@angular/common';

@Component({
    selector: 'app-activity-port',
    imports: [
        NgClass
    ],
    templateUrl: './activity-port.component.html',
    styleUrl: './activity-port.component.scss'
})
export class ActivityPortComponent implements OnChanges {
    @Input() data!: ActivityPort;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        if (this.data.isControl) {
            return this.data.controlType + ' control';
        } else if (!this.data.isInput && this.data.activityState() === 'FINISHED') {
            return this.data.dataModel() + ' (not materialized)';
        }
        let title = '';
        if (this.data.isMulti) {
            title += 'Multiple Connections: ';
        }
        title += this.data.dataModel() || '?';
        if (this.data.portDef['isOptional']) {
            title += ' (optional)';
        }
        return title;
    }

    constructor(private cdr: ChangeDetectorRef, private elementRef: ElementRef) {
        this.cdr.detach();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
    }

}

export class ActivityPort extends ClassicPreset.Socket {
    public readonly isControl: boolean;
    public readonly isMulti: boolean;
    public readonly dataModel = signal<DataModel>(null);

    constructor(public readonly portDef: InPortDef | OutPortDef, public readonly isInput: boolean,
                public readonly controlType: 'success' | 'fail' | 'in' | null,
                public readonly activityState: Signal<ActivityState>) {
        super('');
        this.isControl = controlType != null;
        if (!this.isControl) {
            this.dataModel.set(portTypeToDataModel(portDef.type));
        }
        this.isMulti = isInput && !this.isControl && (portDef as InPortDef)?.isMulti;
    }

    isCompatibleWith(target: ActivityPort) {
        if (this.isControl) {
            return target.isControl;
        }

        return !target.isControl && (this.dataModel() === target.dataModel() || !this.dataModel() || !target.dataModel());

    }
}
