import {Component, Input, Type} from '@angular/core';
import {ListArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {getControl} from '../arg-control-utils';
import {Parameter, ParamTag, ParamType} from '../../models/polyalg-registry';

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
    children: ArgControl[];
    canHideTrivial = this.param.tags.includes(ParamTag.HIDE_TRIVIAL);
    hideTrivial: boolean;

    constructor(param: Parameter, public value: ListArg,
                isReadOnly: boolean, public updateHeight: (height: number) => void) {
        super(param, isReadOnly, true);
        this.children = value.args.map(arg => getControl(param, arg, isReadOnly, updateHeight));
        if (this.children.length === 0 && value.innerType === ParamType.LIST) {
            value.innerType = param.type; // TODO: handle nested lists
        }
        this.hideTrivial = this.isReadOnly && this.canHideTrivial && this.children.filter(c => c.isTrivial()).length > 2;

    }

    getHeight(): number {
        let height = this.children.filter(c => !(this.hideTrivial && c.isTrivial()))
        .reduce((total, child) => total + child.getHeight() + 16, 0);
        if (!this.isReadOnly) {
            height += 33; // add button
        }
        if (this.canHideTrivial) {
            height += 24;
        }
        return 36 + height; // 36: title
    }

    addElement() {
        this.hideTrivial = false;
        this.children.push(getControl(this.param, null, this.isReadOnly, this.updateHeight, false));
        this.updateHeight(this.getHeight());
    }

    removeElement(child: ArgControl) {
        const index = this.children.indexOf(child);
        this.children.splice(index, 1);
        this.updateHeight(this.getHeight());

    }

    toggleHideTrivial() {
        this.hideTrivial = !this.hideTrivial;
        this.updateHeight(this.getHeight());
    }

    getArgComponent(): Type<any> {
        return ListArgComponent;
    }

    toPolyAlg(): string {
        if (this.children.length === 0) {
            return '[]';
        }

        const args = this.children.map(arg => arg.toPolyAlg()).filter(s => s.length > 0).join(', ');
        if (this.children.length === 1 || this.param.canUnpackValues) {
            return args;
        }
        return `[${args}]`;
    }

    copyArg(): PlanArgument {
        const value: ListArg = {
            innerType: this.value.innerType,
            args: this.children.map(arg => arg.copyArg())
        };
        return {type: ParamType.LIST, value: value};
    }
}
