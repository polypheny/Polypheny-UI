import {Component, Input, signal} from '@angular/core';

@Component({
    selector: 'app-reload-button',
    templateUrl: './reload-button.component.html',
    styleUrls: ['./reload-button.component.scss'],
    standalone: false
})
export class ReloadButtonComponent {

    $condition = signal(false);

    @Input() set condition(condition: NonNullable<any>) {
        this.$condition.set(condition);
    }

    $loading = signal(false);

    @Input() set loading(loading: boolean) {
        this.$loading.set(loading);
    }

    @Input() action: (() => void);


}
