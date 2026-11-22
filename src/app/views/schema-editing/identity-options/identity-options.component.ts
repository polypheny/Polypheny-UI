import {Component, Input} from '@angular/core';
import {IdentityColumnOptions, isSignedIdentityInteger} from '../../../models/catalog.model';

@Component({
    selector: 'app-identity-options',
    templateUrl: './identity-options.component.html'
})
export class IdentityOptionsComponent {
    @Input({required: true}) options: IdentityColumnOptions;
    @Input() showMode = true;

    static readonly isInteger = isSignedIdentityInteger;

    static isValid(options: IdentityColumnOptions, requireStartAndIncrement = false): boolean {
        if (!options) {
            return true;
        }
        if (requireStartAndIncrement && (!options.start?.trim() || !options.increment?.trim())) {
            return false;
        }
        const values = [options.start, options.increment, options.min, options.max];
        return values.every(value => !value?.trim() || IdentityOptionsComponent.isInteger(value))
            && !/^[+-]?0+$/.test(options.increment?.trim() ?? '');
    }
}
