import {Component, Input, Type} from '@angular/core';
import {ListArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {getControl} from '../arg-control-utils';
import {Parameter, ParamType} from '../../models/polyalg-registry';

@Component({
    selector: 'app-list-arg',
    templateUrl: './list-arg.component.html',
    styleUrl: './list-arg.component.scss'
})
export class ListArgComponent {
    @Input() data: ListControl;


}

export class ListControl extends ArgControl {
    children: ArgControl[];

    constructor(param: Parameter, public value: ListArg,
                isReadOnly: boolean, public updateHeight: (height: number) => void) {
        super(param, isReadOnly, true);
        this.children = value.args.map(arg => getControl(param, arg, isReadOnly, updateHeight));
    }

    getHeight(): number {
        return this.children.reduce((total, child) => total + child.getHeight(), 0)
            + Object.keys(this.children).length * 16;
    }

    addElement() {
        this.children.push(getControl(this.param, null, this.isReadOnly, this.updateHeight, false));
        this.updateHeight(this.getHeight());
    }

    removeElement(child: ArgControl) {
        const index = this.children.indexOf(child);
        this.children.splice(index, 1);
        this.updateHeight(this.getHeight());

    }

    getArgComponent(): Type<any> {
        return ListArgComponent;
    }

    toPolyAlg(): string {
        if (this.children.length === 0) {
            return '[]';
        }

        const args = this.children.map(arg => arg.toPolyAlg()).join(', ');
        if (this.children.length === 1 || this.param.canUnpackValues) {
            return args;
        }
        return `[${args}]`;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.LIST, value: JSON.parse(JSON.stringify(this.value))};
    }
}
