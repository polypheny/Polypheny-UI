import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';

@Component({
  selector: 'app-edit-columns',
  templateUrl: './edit-columns.component.html',
  styleUrls: ['./edit-columns.component.scss']
})

export class EditColumnsComponent implements OnInit {

  tableId: number;
  test;

  types: string[] = ['VARCHAR', 'INT', 'DOUBLE', 'DATE', 'DATETIME'];

  columns = [
    {name: 'id', type: 'NuMBER', length: 11, signed: 0, nullable: 0, key: 'PRIMARY', editing: false},
    {name: 'lsoa_code', type: 'VARCHAR', length: 255, signed: 0, nullable: 0, key: 'UNIQUE', editing: false},
    {name: 'borough', type: 'VARCHAR', length: 255, signed: 0, nullable: 0, key: '', editing: false},
    {name: 'major_category', type: 'VARCHAR', length: 255, signed: 0, nullable: 1, key: '', editing: false},
    {name: 'minor_category', type: 'VARCHAR', length: 255, signed: 0, nullable: 1, key: '', editing: false},
    {name: 'value', type: 'INT', length: 10, signed: 0, nullable: 0, key: '', editing: false},
    {name: 'year', type: 'DATE', length: 4, signed: 0, nullable: 0, key: '', editing: false},
    {name: 'month', type: 'DATE', length: 2, signed: 0, nullable: 0, key: '', editing: false}
  ];

  constructor(private _route: ActivatedRoute) { }

  ngOnInit() {
    this.tableId = +this._route.snapshot.paramMap.get('id');

    const self = this;
    $(document).on('click', function(e){
        if(!$(e.target).hasClass('editing')){
          for(const col of self.columns){
            col.editing = false;
          }
          // todo save changes
        }
    });

    // todo focus when rendering input:
    // https://www.codementor.io/yomateo/auto-focus-with-angular-7-the-directive-osfcl7rrv
  }

}
