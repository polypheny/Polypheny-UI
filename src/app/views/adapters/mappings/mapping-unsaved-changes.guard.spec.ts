import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {MappingUnsavedChangesGuard} from './mapping-unsaved-changes.guard';

@Component({standalone: true, template: ''})
class GuardedMapping {
    canDeactivate = jasmine.createSpy('canDeactivate').and.returnValue(false);
}

describe('MappingUnsavedChangesGuard', () => {
    it('guards parameter changes while Angular reuses the editor component', async () => {
        TestBed.configureTestingModule({providers: [provideRouter([{
            path: 'adapters/:adapterId/mappings/:mappingId', component: GuardedMapping,
            canDeactivate: [MappingUnsavedChangesGuard], runGuardsAndResolvers: 'paramsChange'
        }])]});
        const harness = await RouterTestingHarness.create();
        const first = await harness.navigateByUrl('/adapters/7/mappings/31', GuardedMapping);
        await harness.navigateByUrl('/adapters/7/mappings/32');
        expect(first.canDeactivate).toHaveBeenCalledTimes(1);
        first.canDeactivate.and.returnValue(true);
        const second = await harness.navigateByUrl('/adapters/7/mappings/32', GuardedMapping);
        expect(second).toBe(first);
        expect(first.canDeactivate).toHaveBeenCalledTimes(2);
    });
});
