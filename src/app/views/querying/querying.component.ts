import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
    selector: 'app-querying',
    templateUrl: './querying.component.html',
    styleUrls: ['./querying.component.scss'],
})
export class QueryingComponent implements OnInit {

    private readonly _route = inject(ActivatedRoute);

    public route = 'console';

    constructor() {
    }

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
