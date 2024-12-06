import { Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
    selector: 'app-submit-execute-button',
    templateUrl: './submit-query-button.component.html',
    styleUrls: ['submit-query-button.component.scss']
})
export class SubmitQueryButtonComponent {
    @Input() loading: boolean = false;
    @Input() language: string = 'sql';

    @Output() languageChange = new EventEmitter<string>();
    @Output() submitQuery = new EventEmitter<void>();

    onLanguageChange(newLanguage: string): void {
        this.languageChange.emit(newLanguage);
    }

    onExecute(): void {
        this.submitQuery.emit();
    }
}
