import {Component, OnInit} from '@angular/core';
import {LoadingScreenService} from './loading-screen.service';

@Component({
    selector: 'app-loading-screen',
    templateUrl: './loading-screen.component.html',
    styleUrls: ['./loading-screen.component.scss']
})
export class LoadingScreenComponent implements OnInit {

    show = false;

    constructor(private _loading: LoadingScreenService) {
    }

    ngOnInit(): void {
        this._loading.onVisibilityChange().subscribe(res => this.show = res);
    }

}
