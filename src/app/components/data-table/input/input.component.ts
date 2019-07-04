import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DbColumn} from '../models/result-set.model';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent implements OnInit {

  @Input() header: DbColumn;
  @Input() value;
  @Output() valueChange = new EventEmitter();

  constructor() { }

  ngOnInit() {}

  triggerNull ( value ) {
    if( value !== null) return null;
    else{
      switch (this.header.dataType) {
        case 'int4':
        case 'int8':
          return 0;
        case 'bool':
          return false;
        default:
          return '';
      }
    }
  }

  onValueChange(newVal ){
    this.valueChange.emit( newVal );
  }

}
