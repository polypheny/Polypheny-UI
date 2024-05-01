import {Component, Input, Type} from '@angular/core';
import {PlanArgument, StringArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamTag, ParamType} from '../../models/polyalg-registry';

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
    if (value.alias === value.arg) {
      value.alias = '';
    }
    this.showAlias = param.tags.includes(ParamTag.ALIAS);
  }

  getHeight(): number {
    return this.name ? 55 : 31;
  }

  getArgComponent(): Type<any> {
    return StringArgComponent;
  }

  toPolyAlg(): string {
    if (this.showAlias && this.value.alias !== '' && this.value.alias !== this.value.arg) {
      return `${this.value.arg} AS ${this.value.alias}`;
    }
    return this.value.arg;
  }

  copyArg(): PlanArgument {
    return {type: ParamType.STRING, value: JSON.parse(JSON.stringify(this.value))};
  }

}
