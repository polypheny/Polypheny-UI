import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {DbColumn} from '../models/result-set.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import * as $ from 'jquery';
import flatpickr from 'flatpickr';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() header: DbColumn;
  @Input() value;
  @Output() valueChange = new EventEmitter();
  @Output() enter = new EventEmitter();
  @ViewChild('inputElement', {static: false}) inputElement: ElementRef;
  @ViewChild('flatpickr', {static: false}) flatpickrElement: ElementRef;
  flatpickrObj;
  inputFileName = 'Choose file';
  randomId;

  constructor(
    public _types: DbmsTypesService
  ) {
    this.randomId = Math.floor((Math.random()*10e8));
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
    if ( !changes.value.currentValue ) {
      this.inputFileName = 'Choose file';
    }
  }

  triggerNull(value) {
    if( value !== null) return null;
    else{
      if( this._types.isNumeric( this.header.dataType )){
        return 0;
      } else if ( this._types.isBoolean( this.header.dataType )){
        return false;
      } else if ( this._types.isMultimedia( this.header.dataType )){
        return null;
      } else {
        return '';
      }
    }
  }

  onValueChange( newVal, event = null ){
    this.valueChange.emit( newVal );
    if ( event !== null && event.keyCode === 13 ){
      this.enter.emit( true );
    }
  }

  onNumericValueChange ( newVal, inputElement, event = null ) {
    this.onValueChange( newVal, event );
    this.validate( newVal, inputElement );
  }

  validate(val, inputElement) {
    if (isNaN(val)) {
      $(inputElement).addClass('is-invalid').removeClass('is-valid');
    } else if (!isNaN(val) && val !== null) {
      $(inputElement).addClass('is-valid').removeClass('is-invalid');
    } else {
      $(inputElement).removeClass('is-valid').removeClass('is-invalid');
    }
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

  onFileChange ( files, event = null ) {
    if( files === null ){
      this.valueChange.emit(null);
      if(event){
        event.stopPropagation();
      }
      return;
    }
    let file;
    if(files.length > 0){
      file = files[0];
    } else {
      file = undefined;
    }
    if( file ) {
      this.inputFileName = file.name;
      this.value = file;
    } else {
      this.inputFileName = 'Choose file';
      this.value = undefined;
    }
    this.valueChange.emit(file);
  }

}
