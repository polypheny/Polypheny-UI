import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'multipleSwitch',
})
export class MultipleSwitchPipe implements PipeTransform {
  transform<T = any>(cases: T[], value: T): T {
    return cases.includes(value) ? value : cases[0];
  }
}
