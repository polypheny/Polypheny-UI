import {ClassicPreset} from 'rete';
import {Signal, signal, Type} from '@angular/core';
import {Parameter} from '../models/polyalg-registry';
import {PlanArgument} from '../models/polyalg-plan.model';

export abstract class ArgControl extends ClassicPreset.Control {
    readonly name: string;
    isTrivial: Signal<boolean> = signal(false);
    height: Signal<number>;

    protected constructor(public readonly param: Parameter, public isReadOnly: boolean, isForOuter = false) {
        super();
        this.name = param.isMultiValued && !isForOuter ? null : param.name;
    }

    abstract getArgComponent(): Type<any>;

    abstract toPolyAlg(): string;

    abstract copyArg(): PlanArgument;
}