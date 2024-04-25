import {Component, Input, Type} from '@angular/core';
import {StringArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';

@Component({
  selector: 'app-string-arg',
  templateUrl: './string-arg.component.html',
  styleUrl: './string-arg.component.scss'
})
export class StringArgComponent {
  @Input() data: StringControl;

}

export class StringControl extends ArgControl {
  constructor(name: string, public value: StringArg, readonly: boolean) {
    super(name, readonly);
  }

  getHeight(): number {
    return 55;
  }

  getArgComponent(): Type<any> {
    return StringArgComponent;
  }

}
