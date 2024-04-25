import {Component, Input, Type} from '@angular/core';
import {ListArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {getControl} from '../arg-control-utils';

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

    constructor(name: string, public value: ListArg, readonly: boolean) {
        super(name, readonly);
        this.children = value.args.map(arg => getControl('', arg, readonly));
    }

    getHeight(): number {
        return this.children.reduce((total, child) => total + child.getHeight(), 0)
            + Object.keys(this.children).length * 16;
    }

    addElement() {
        console.log('add child');
        this.children.push(getControl('', {type: 'REX', value: {rex: 'abc', alias: ''}}, this.readonly));
    }

    getArgComponent(): Type<any> {
        return ListArgComponent;
    }
}
