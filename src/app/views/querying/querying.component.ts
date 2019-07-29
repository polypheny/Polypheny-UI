import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-querying',
  templateUrl: './querying.component.html',
  styleUrls: ['./querying.component.scss']
})
export class QueryingComponent implements OnInit {

  private route = 'sql-console';
  constructor(
    private _route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.getRoute();
  }

  getRoute() {
    this.route = this._route.snapshot.paramMap.get('route');
    this._route.params.subscribe(params => {
      this.route = params['route'];
    });
  }
}
