import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

@Pipe({
    name: 'safeHtml'
})
// https://stackblitz.com/edit/angular-safehtml-pipe
export class SafeHtmlPipe implements PipeTransform {
    constructor(private sanitized: DomSanitizer) {
    }

    transform(value) {
        return this.sanitized.bypassSecurityTrustHtml(value);
    }

}
