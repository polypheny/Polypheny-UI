import {Component, EventEmitter, Input, model, Output, ViewEncapsulation} from '@angular/core';

/**
 * A light-weight wrapper around the ng-autocomplete component.
 * Its purpose is to introduce the CoreUI style.
 * If more inputs are required, they can be added in the future.
 * Also see https://www.npmjs.com/package/angular-ng-autocomplete
 */
@Component({
    selector: 'app-autocomplete',
    templateUrl: './autocomplete.component.html',
    styleUrl: './autocomplete.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class AutocompleteComponent {
    value = model.required<string>();

    @Input({required: true}) data: any[];
    //@Input({ required: true }) searchKeyword: string; removed, instead we use value()
    @Input() placeholder: string;
    @Input() notFoundText = 'Not Found';
    @Input() disabled = false;

    @Output() changed = new EventEmitter<any>(); // new output, combines selected and inputChanged
    @Output() selected = new EventEmitter<any>();
    @Output() inputChanged = new EventEmitter<any>();
    @Output() inputFocused = new EventEmitter<void>();
    @Output() inputCleared = new EventEmitter<void>();
    @Output() opened = new EventEmitter<void>();
    @Output() closed = new EventEmitter<void>();
    @Output() scrolledToEnd = new EventEmitter<void>();

    onItemSelected(event: any): void {
        this.selected.emit(event);
        this.changed.emit(event);
    }

    onInputChanged(event: any): void {
        this.inputChanged.emit(event);
        this.changed.emit(event);
    }

    onInputFocused(): void {
        this.inputFocused.emit();
    }

    onInputCleared(): void {
        this.inputCleared.emit();
    }

    onOpened(): void {
        this.opened.emit();
    }

    onClosed(): void {
        this.closed.emit();
    }

    onScrolledToEnd(): void {
        this.scrolledToEnd.emit();
    }

}
