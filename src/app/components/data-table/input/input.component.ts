import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DbColumn} from '../models/result-set.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent implements OnInit {

  @Input() header: DbColumn;
  @Input() value;
  @Output() valueChange = new EventEmitter();
  @Output() enter = new EventEmitter();

  constructor(
    public _types: DbmsTypesService
  ) { }

  ngOnInit() {}

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

}
