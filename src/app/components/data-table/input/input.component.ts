import {Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange, SimpleChanges, ViewChild} from '@angular/core';
import {DbColumn} from '../models/result-set.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import * as $ from 'jquery';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent implements OnInit, OnChanges {

  @Input() header: DbColumn;
  @Input() value;
  @Output() valueChange = new EventEmitter();
  @Output() enter = new EventEmitter();
  @ViewChild('inputElement') inputElement: ElementRef;

  constructor(
    public _types: DbmsTypesService
  ) { }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if( this.inputElement !== undefined && changes.value && changes.value.currentValue === null ){
      $(this.inputElement.nativeElement).removeClass('is-valid').removeClass('is-invalid');
    }
  }

  triggerNull ( value ) {
    if( value !== null) return null;
    else{
      if( this._types.isNumeric( this.header.dataType )){
        return 0;
      } else if ( this._types.isBoolean( this.header.dataType )){
        return false;
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

  validate ( val, inputElement ) {
    if( isNaN( val ) ){
      $(inputElement).addClass('is-invalid').removeClass('is-valid');
    } else if ( !isNaN( val ) && val !== null ) {
      $(inputElement).addClass('is-valid').removeClass('is-invalid');
    } else {
      $(inputElement).removeClass('is-valid').removeClass('is-invalid');
    }
  }

}
