import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DataTableComponent} from '../../components/data-table/data-table.component';
import {TableConfig} from '../../components/data-table/table-config';
import {GraphComponent} from '../../components/graph/graph.component';

@Component({
  selector: 'app-sql-console',
  templateUrl: './sql-console.component.html',
  styleUrls: ['./sql-console.component.scss']
})
export class SqlConsoleComponent implements OnInit {

  myForm: FormGroup;
  languages = ['SQL', 'PgSql', 'MS-SQL'];
  debugOptionsCollapsed = true;

  data = [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f']
  ];
  config:TableConfig = {
    create:false
  };

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    this.myForm = this.formBuilder.group({
      lang: 'SQL'
    });
  }

}
