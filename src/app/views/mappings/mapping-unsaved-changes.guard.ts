import {Injectable} from '@angular/core';
import {CanDeactivate} from '@angular/router';

export interface MappingCanDeactivate {
    canDeactivate(): boolean | Promise<boolean>;
}

@Injectable({providedIn: 'root'})
export class MappingUnsavedChangesGuard implements CanDeactivate<MappingCanDeactivate> {
    canDeactivate(component: MappingCanDeactivate) {
        return component.canDeactivate();
    }
}
