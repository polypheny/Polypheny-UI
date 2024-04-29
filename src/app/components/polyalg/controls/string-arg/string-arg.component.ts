import {Component, Input, Type} from '@angular/core';
import {StringArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamTag} from '../../models/polyalg-registry';

@Component({
  selector: 'app-string-arg',
  templateUrl: './string-arg.component.html',
  styleUrl: './string-arg.component.scss'
})
export class StringArgComponent {
  @Input() data: StringControl;

}

export class StringControl extends ArgControl {
  readonly showAlias: boolean;

  constructor(param: Parameter, public value: StringArg, isReadOnly: boolean) {
    super(param, isReadOnly);
    this.showAlias = param.tags.includes(ParamTag.ALIAS);
  }

  getHeight(): number {
    return 55;
  }

  getArgComponent(): Type<any> {
    return StringArgComponent;
  }

}
