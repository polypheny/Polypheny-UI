import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';

// https://stackoverflow.com/questions/35922071/warn-user-of-unsaved-changes-before-leaving-page
export interface ComponentCanDeactivate {
    canDeactivate: (component: ComponentCanDeactivate, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState: RouterStateSnapshot) => boolean | Observable<boolean>;
}

@Injectable()
export class UnsavedChangesGuard implements CanDeactivate<ComponentCanDeactivate> {
    canDeactivate(
        component: ComponentCanDeactivate,
        currentRoute: ActivatedRouteSnapshot,
        currentState: RouterStateSnapshot,
        nextState?: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return component.canDeactivate(component, currentRoute, currentState, nextState);
    }

}
