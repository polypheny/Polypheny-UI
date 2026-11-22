import {createTupleFormData, createUpdateTupleFormData} from './data-view.model';
import {FieldDefinition} from './models/result-set.model';

describe('createTupleFormData', () => {
    const header: FieldDefinition[] = [
        {name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, identity: {mode: 'BY_DEFAULT', cycle: false}},
        {name: 'sequence', dataType: 'BIGINT', nullable: false, defaultValue: null, identity: {mode: 'ALWAYS', cycle: false}},
        {name: 'description', dataType: 'VARCHAR', nullable: true, defaultValue: null}
    ];

    it('omits generated-always values and cleared overrides', () => {
        const values = new Map([['id', ' '], ['sequence', '13'], ['description', '']]);
        const dirty = new Map([['id', true], ['sequence', true], ['description', true]]);

        const form = createTupleFormData(header, values, dirty, 42);

        expect(form.has('id')).toBeFalse();
        expect(form.has('sequence')).toBeFalse();
        expect(form.get('description')).toBe('');
        expect(form.get('entityId')).toBe('42');
    });

    it('keeps explicit BIGINT overrides as strings', () => {
        const values = new Map([['id', '9223372036854775807']]);
        const dirty = new Map([['id', true]]);

        expect(createTupleFormData(header, values, dirty, 42).get('id')).toBe('9223372036854775807');
    });
});

describe('createUpdateTupleFormData', () => {
    const header: FieldDefinition[] = [
        {name: 'tenant', dataType: 'INTEGER', nullable: false, defaultValue: null},
        {name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, identity: {mode: 'ALWAYS', cycle: false}},
        {name: 'description', dataType: 'VARCHAR', nullable: true, defaultValue: null}
    ];

    it('sends complete previous values, including an exact BIGINT identity, without updating ALWAYS columns', () => {
        const values = new Map([['tenant', '1'], ['id', '1'], ['description', 'new']]);
        const form = createUpdateTupleFormData(header, ['1', '9223372036854775807', 'old'], values, 42);
        expect(form.has('id')).toBeFalse();
        expect(JSON.parse(String(form.get('oldValues')))).toEqual({
            tenant: '1', id: '9223372036854775807', description: 'old'
        });
        expect(form.get('description')).toBe('"new"');
    });

    it('does not submit an update that only contains an ALWAYS column', () => {
        expect(createUpdateTupleFormData(header, ['1', '2', 'old'], new Map([['id', '2']]), 42)).toBeNull();
    });
});
