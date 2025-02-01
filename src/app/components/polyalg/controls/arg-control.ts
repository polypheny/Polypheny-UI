import {ClassicPreset} from 'rete';
import {computed, Signal, signal, Type} from '@angular/core';
import {OperatorModel, Parameter, SimpleType} from '../models/polyalg-registry';
import {PlanArgument} from '../models/polyalg-plan.model';
import {PlanType} from '../../../models/information-page.model';

export abstract class ArgControl extends ClassicPreset.Control {
    readonly name: string;
    isTrivial: Signal<boolean> = signal(false);
    height: Signal<number>;
    readonly visibleHeight: Signal<number>;
    readonly isHidden: Signal<boolean>;
    readonly simpleType: Signal<SimpleType>; // if node is not in simple mode, this is always null

    protected constructor(public readonly param: Parameter, public readonly model: OperatorModel, public readonly planType: PlanType,
                          public readonly isSimpleMode: Signal<boolean>, public isReadOnly: boolean, enforceName = false) {
        super();
        this.name = param.multiValued > 0 && !enforceName ? null : param.name;
        this.isHidden = computed(() => param.simpleType === SimpleType.HIDDEN && this.isSimpleMode());
        this.visibleHeight = computed(() => this.isHidden() ? 0 : this.height());
        this.simpleType = computed(() => this.isSimpleMode() ? param.simpleType : null);
    }

    abstract getArgComponent(): Type<any>;

    abstract toPolyAlg(): string;

    abstract copyArg(): PlanArgument;
}
