import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TableConfig} from '../../components/data-table/table-config';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit {

  tableId: number;
  data = [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f']
  ];
  tableConfig: TableConfig = {
    create: true,
    search: true,
    sort: true,
    update: true
  };

  constructor(private _route: ActivatedRoute) { }

  ngOnInit() {
    this.tableId = +this._route.snapshot.paramMap.get('id');

    //listen to parameter changes
    this._route.params.subscribe((params) => {
      this.tableId = +params['id'];
    });
  }

}
