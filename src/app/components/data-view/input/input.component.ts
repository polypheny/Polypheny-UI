import {AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {FieldDefinition, UiColumnDefinition} from '../models/result-set.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import * as $ from 'jquery';
import flatpickr from 'flatpickr';
import {InputValidation} from '../models/sort-state.model';

function getObjectId() {
    // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    const s = 'abcdef0123456789';
    return 'ObjectId(' + Array.apply(null, Array(24)).map(() => s.charAt(Math.floor(Math.random() * s.length))).join('') + ')';
}

@Component({
    selector: 'app-input',
    templateUrl: './input.component.html',
    styleUrls: ['./input.component.scss']
})
export class InputComponent implements OnInit, OnChanges, AfterViewInit {

    public readonly _types = inject(DbmsTypesService);

    constructor() {
        this.randomId = Math.floor((Math.random() * 10e8));
    }

    @Input() header: UiColumnDefinition | FieldDefinition;
    @Input() value: any;
    @Input() showLabel? = false;
    @Output() valueChange = new EventEmitter();
    @Output() enter = new EventEmitter();
    @ViewChild('inputElement', {static: false}) inputElement: ElementRef;
    @ViewChild('flatpickr', {static: false}) flatpickrElement: ElementRef;
    @ViewChild('fileInput', {static: false}) fileInput: ElementRef;
    flatpickrObj;
    inputFileName = 'Choose File';
    randomId;

    private static validateJSON(val) {
        let doc = val.replace(/NumberDecimal\("[0-9.]*"\)/g, '0');
        doc = doc.replace(/[0-9a-zA-Z.]+[*\/+-]+[0-9a-zA-Z.]+/g, '0');
        if (doc === '') {
            return new InputValidation(false, 'Non-valid document');
        }
        try {
            doc = JSON.parse(doc);
        } catch (Exception) {
            return new InputValidation(false, 'Non-valid document');
        }
        return new InputValidation(true);
    }

    ngOnInit() {

    }

    ngAfterViewInit() {
        this.initFlatpickr();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.inputElement !== undefined && changes.value && changes.value.currentValue === null) {
            $(this.inputElement.nativeElement).removeClass('is-valid').removeClass('is-invalid');
        } else if (this._types.isDateTime(this.header.dataType) && (changes.value.currentValue == null || changes.value.currentValue === '') && this.flatpickrObj) {
            this.flatpickrObj.setDate(null);
        }
        if (!changes.value.currentValue) {
            this.inputFileName = 'Choose file';
            if (this.fileInput) {
                //see https://stackoverflow.com/questions/49976714/how-to-upload-the-same-file-in-angular4
                this.fileInput.nativeElement.value = '';
            }
        }
    }

    triggerNull(value) {
        if (value !== null) {
            return null;
        }

        if ((this.header instanceof UiColumnDefinition) && this.header.collectionsType) {
            return '';
        } else if (this._types.isNumeric(this.header.dataType)) {
            return 0;
        } else if (this._types.isBoolean(this.header.dataType)) {
            return false;
        } else if (this._types.isMultimedia(this.header.dataType)) {
            return null;
        } else {
            return '';
        }
    }

    onValueChange(newVal: any, event = null) {
        this.valueChange.emit(newVal);
        if (event !== null && event.keyCode === 13) {
            this.enter.emit(true);
        }
    }

    validate(inputElement): InputValidation {
        const val = inputElement.value;
        if (!val) {
            return;
        }
        if (!(this.header instanceof UiColumnDefinition)) {
            return null;
        }

        if (this.header.collectionsType) {
            return this.validateArray(val);
        } else if (this._types.isNumeric(this.header.dataType)) {
            if (isNaN(val)) {
                return new InputValidation(false, 'Non-numeric input');
            }
        } else if (this.header.dataType.toLowerCase() === 'json') {
            return InputComponent.validateJSON(val);

        }
    }

    private validateArray(val) {
        if (val.startsWith('[') && val.endsWith(']')) {
            if (!this._types.isNumeric(this.header.dataType)) {
                //don't make further checks on non-numeric arrays
                return;
            }
            if (!(this.header instanceof UiColumnDefinition)) {
                return null;
            }

            try {
                const parsed = JSON.parse(val);
                if (!Array.isArray(parsed)) {
                    return new InputValidation(false, 'Non-valid array');
                } else {
                    if (this.header.cardinality && this.getMaxCardinality(parsed) > this.header.cardinality) {
                        return new InputValidation(false, 'Exceeded max cardinality of ' + this.header.cardinality);
                    } else if (this.header.dimension && this.getMaxDimension(parsed) > this.header.dimension) {
                        return new InputValidation(false, 'Exceeded max dimension of ' + this.header.dimension);
                    }
                    return new InputValidation(true);
                }
            } catch (e) {
                return new InputValidation(false, 'Non-valid array');
            }
        } else {
            return new InputValidation(false, 'Non-valid array');
        }
    }

    getMaxDimension(arr: number[]): number {
        let maxDim = 1;
        for (const ele of arr) {
            if (Array.isArray(ele)) {
                maxDim = Math.max(maxDim, this.getMaxDimension(ele) + 1);
            }
        }
        return maxDim;
    }

    getMaxCardinality(arr: number[]): number {
        let maxCard = arr.length;
        for (const ele of arr) {
            if (Array.isArray(ele)) {
                maxCard = Math.max(maxCard, this.getMaxCardinality(ele));
            }
        }
        return maxCard;
    }

    initFlatpickr() {
        // https://flatpickr.js.org/options/
        const self = this;

        function onChange(selectedDates, dateStr, instance) {
            self.onValueChange(dateStr);
        }

        switch (this.header.dataType.toLowerCase()) {
            case 'date':
                this.flatpickrObj = flatpickr(this.flatpickrElement.nativeElement, {
                    dateFormat: 'Y-m-d',
                    onChange: onChange
                });
                break;
            case 'time':
                this.flatpickrObj = flatpickr(this.flatpickrElement.nativeElement, {
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: 'H:i:S',
                    time_24hr: true,
                    onChange: onChange
                });
                break;
            case 'timestamp':
                this.flatpickrObj = flatpickr(this.flatpickrElement.nativeElement, {
                    enableTime: true,
                    dateFormat: 'Y-m-d H:i:S',
                    time_24hr: true,
                    onChange: onChange
                });
                break;
        }
    }

    clearFlatpickr() {
        this.valueChange.emit(null);
    }

    onFileChange(files, event = null) {
        if (files === null) {
            this.valueChange.emit(null);
            if (event) {
                event.stopPropagation();
            }
            return;
        }
        let file;
        if (files.length > 0) {
            file = files[0];
        } else {
            file = undefined;
        }
        if (file) {
            this.inputFileName = file.name;
            this.value = file;
        } else {
            this.inputFileName = 'Choose file';
            this.value = undefined;
        }
        this.valueChange.emit(file);
    }

    // Somewhat hacky fix to restrict input to numbers without relying on type="number".
    restrictNumericInput(event: KeyboardEvent) {
        const allowedKeys = [
            'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'
        ];

        // Allow navigation and control keys
        if (allowedKeys.includes(event.key)) {
            return;
        }

        // Allow digits, one dot, and one minus at the start
        const current = (event.target as HTMLInputElement).value;
        const key = event.key;

        // Prevent multiple dots
        if (key === '.' && current.includes('.')) {
            event.preventDefault();
            return;
        }

        // Prevent minus except at the beginning
        if (key === '-' && current.length > 0) {
            event.preventDefault();
            return;
        }

        // Prevent non-numeric characters
        if (!/[0-9.-]/.test(key)) {
            event.preventDefault();
        }
    }

    // Enables pasting via context menu
    sanitizePastedInput(event: ClipboardEvent) {
        const pasted = event.clipboardData?.getData('text') ?? '';
        const sanitized = pasted.replace(/[^0-9.-]/g, '');

        event.preventDefault();

        const input = event.target as HTMLInputElement;
        const {selectionStart, selectionEnd, value} = input;

        // Replace selected text with sanitized paste
        input.value =
            value.slice(0, selectionStart ?? 0) +
            sanitized +
            value.slice(selectionEnd ?? 0);

        // Trigger manual input event
        const nativeInputEvent = new Event('input', {bubbles: true});
        input.dispatchEvent(nativeInputEvent);
    }
}
