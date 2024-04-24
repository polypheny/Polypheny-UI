import {Component, Input, Type} from '@angular/core';
import {EntityArg} from "../../models/polyalg-plan.model";
import {ArgControl} from "../arg-control";

@Component({
  selector: 'app-entity-arg',
  templateUrl: './entity-arg.component.html',
  styleUrl: './entity-arg.component.scss'
})
export class EntityArgComponent {
  @Input() data: EntityControl;
}

export class EntityControl extends ArgControl {
  constructor(name: string, public value: EntityArg, readonly: boolean) {
    super(name, readonly);
  }

  getHeight(): number {
    return 40;
  }

  getArgComponent(): Type<any> {
    return EntityArgComponent;
  }
}
