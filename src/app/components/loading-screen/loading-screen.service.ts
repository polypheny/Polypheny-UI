import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoadingScreenService {

    private isLoading = new BehaviorSubject<boolean>(false);

    constructor() {
    }

    show() {
        this.isLoading.next(true);
    }

    hide() {
        this.isLoading.next(false);
    }

    onVisibilityChange() {
        return this.isLoading;
    }

    isShown() {
        return this.isLoading.getValue();
    }
}
