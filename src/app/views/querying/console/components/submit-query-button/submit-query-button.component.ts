import {Component, EventEmitter, Input, Output} from '@angular/core';
import {QUERY_LANGUAGES} from '../console-helper';


@Component({
    selector: 'app-submit-execute-button',
    templateUrl: './submit-query-button.component.html',
    styleUrls: ['submit-query-button.component.scss']
})
export class SubmitQueryButtonComponent {
    @Input() loading = false;
    @Input() language = 'sql';

    @Output() languageChange = new EventEmitter<string>();
    @Output() submitQuery = new EventEmitter<void>();

    protected readonly QUERY_LANGUAGES = QUERY_LANGUAGES;

    onLanguageChange(newLanguage: string): void {
        this.languageChange.emit(newLanguage);
    }

    onExecute(): void {
        this.submitQuery.emit();
    }
}
