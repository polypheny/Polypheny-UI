import {IdentityOptionsComponent} from './identity-options.component';

describe('IdentityOptionsComponent', () => {
    it('accepts unsigned and signed numeric strings without coercing BIGINT values', () => {
        expect(IdentityOptionsComponent.isValid({
            mode: 'BY_DEFAULT',
            start: '9223372036854775807',
            increment: '-1',
            min: '-9223372036854775808',
            cycle: false
        })).toBeTrue();
    });

    it('allows absent defaults and rejects decimals and a zero increment', () => {
        expect(IdentityOptionsComponent.isValid({mode: 'ALWAYS', cycle: false})).toBeTrue();
        expect(IdentityOptionsComponent.isValid({mode: 'BY_DEFAULT', cycle: false, start: '1.5'})).toBeFalse();
        expect(IdentityOptionsComponent.isValid({mode: 'BY_DEFAULT', cycle: false, increment: '-0'})).toBeFalse();
    });
});
