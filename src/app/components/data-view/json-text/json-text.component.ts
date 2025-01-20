import {Component, computed, input, OnInit, Signal} from '@angular/core';

@Component({
    selector: 'app-json-text',
    templateUrl: './json-text.component.html',
    styleUrls: ['./json-text.component.scss']
})
export class JsonTextComponent implements OnInit {

    text = input<string>();

    private readonly regex = new RegExp('/ObjectId(\d{1,24})/g');
    json: Signal<any>;

    constructor() {
    }

    ngOnInit(): void {
        this.json = computed(() => {
            if (this.regex.test(this.text())) {
                return {};
            }
            return this.parse(this.text());
        });
    }

    parse(text: string): {} {
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }
}
