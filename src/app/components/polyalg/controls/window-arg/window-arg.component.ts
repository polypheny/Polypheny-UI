import {Component, Input, Signal, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {PlanArgument, WindowGroupArg} from '../../models/polyalg-plan.model';
import {OperatorModel, Parameter, ParamType} from '../../models/polyalg-registry';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-window-arg',
    templateUrl: './window-arg.component.html',
    styleUrl: './window-arg.component.scss',
    standalone: false
})
export class WindowArgComponent {
    @Input() data: WindowControl;

    protected readonly JSON = JSON;
}

export class WindowControl extends ArgControl {
    height = signal(this.name ? 200 : 180);

    constructor(param: Parameter, public value: WindowGroupArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    copyArg(): PlanArgument {
        return {type: ParamType.WINDOW_GROUP, value: JSON.parse(JSON.stringify(this.value))};
    }

    getArgComponent(): Type<any> {
        return WindowArgComponent;
    }

    toPolyAlg(): string {
        return 'not implemented'; // Not yet implemented in the backend!
    }

}