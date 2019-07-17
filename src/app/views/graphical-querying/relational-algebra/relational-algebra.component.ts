import {Component, Input, OnInit} from '@angular/core';
import {LogicalOperators, RelationalAlgebra} from './relational-algebra.model';

@Component({
  selector: 'app-relational-algebra',
  templateUrl: './relational-algebra.component.html',
  styleUrls: ['./relational-algebra.component.scss']
})
export class RelationalAlgebraComponent implements OnInit {

  @Input() relationalAlgebra: RelationalAlgebra;

  constructor() { }

  ngOnInit() {
  }

  addChild(){
    this.relationalAlgebra.addChild( new RelationalAlgebra( LogicalOperators.LogicalAggregate, this.relationalAlgebra ));
  }

  close() {
    if( this.relationalAlgebra.parent !== undefined ){
      this.relationalAlgebra.parent.removeChild(this.relationalAlgebra);
    }
  }

  /**
   * List enums of LogicalOperators for the select menu
   */
  getOperators () {
    //from https://stackoverflow.com/questions/43100718/typescript-enum-to-object-array
    return Object.keys(LogicalOperators)
      .filter(k => !isNaN(Number(k)))
      .map(key => LogicalOperators[key]);
  }

}
