import {Component, computed, Input, Signal, signal, Type, WritableSignal} from '@angular/core';
import {ListArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {getControl} from '../arg-control-utils';
import {Parameter, ParamTag, ParamType} from '../../models/polyalg-registry';
import {DataModel} from '../../../../models/ui-request.model';

@Component({
    selector: 'app-list-arg',
    templateUrl: './list-arg.component.html',
    styleUrl: './list-arg.component.scss'
})
export class ListArgComponent {
    @Input() data: ListControl;


    protected readonly ParamType = ParamType;
}

export class ListControl extends ArgControl {
    children: WritableSignal<ArgControl[]>;
    canHideTrivial = this.param.tags.includes(ParamTag.HIDE_TRIVIAL);
    hideTrivial: WritableSignal<boolean>;
    height = computed(() => this.computeHeight());

    constructor(param: Parameter, public value: ListArg, public depth: number, model: DataModel,
                isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, isSimpleMode, isReadOnly, depth === 0);
        if (value.args.length === 1 && value.args[0].type === ParamType.LIST && (value.args[0].value as ListArg).args.length === 0) {
            // remove empty inner list, as they have no effect and can be confusing if not created explicitly by the user
            value.args = [];
        }

        this.children = signal(value.args.map(arg => getControl(param, arg, isReadOnly, depth + 1, model, isSimpleMode)));
        if (this.children().length === 0 && value.innerType === ParamType.LIST && depth === param.multiValued - 1) {
            value.innerType = param.type;
        }
        this.hideTrivial = signal(this.isReadOnly && this.canHideTrivial && this.children().filter(c => c.isTrivial()).length > 2);

    }

    computeHeight(): number {
        let height = this.children().filter(c => !(this.hideTrivial() && c.isTrivial()))
        .reduce((total, child) => total + child.height() + 16, 0);
        if (!this.isReadOnly) {
            height += 33; // add button
        }
        if (this.canHideTrivial) {
            height += 24;
        }
        return 36 + height; // 36: title
    }

    addElement() {
        this.hideTrivial.set(false);
        this.children.update(values =>
            [...values, getControl(this.param, null, this.isReadOnly, this.depth + 1, this.model, this.isSimpleMode)]);
    }

    removeElement(child: ArgControl) {
        this.children.update(values => values.filter(c => c !== child));

    }

    toggleHideTrivial() {
        this.hideTrivial.update(old => !old);
    }

    getArgComponent(): Type<any> {
        return ListArgComponent;
    }

    toPolyAlg(): string {
        if (this.children().length === 0) {
            return '[]';
        }

        const args = this.children().map(arg => arg.toPolyAlg()).filter(s => s.length > 0).join(', ');
        if (this.param.multiValued === 1 && (this.children().length === 1 || this.param.canUnpackValues)) {
            return args;
        }
        return `[${args}]`;
    }

    copyArg(): PlanArgument {
        const value: ListArg = {
            innerType: this.value.innerType,
            args: this.children().map(arg => arg.copyArg())
        };
        return {type: ParamType.LIST, value: value};
    }
}
