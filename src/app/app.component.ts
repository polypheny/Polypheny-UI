import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';

@Component({
    // tslint:disable-next-line
    selector: 'body',
    templateUrl: './app.component.html',
    standalone: false
})
export class AppComponent implements OnInit {
    constructor(private router: Router) {
    }

    ngOnInit() {
        this.router.events.subscribe((evt) => {
            if (!(evt instanceof NavigationEnd)) {
                return;
            }
            window.scrollTo(0, 0);
        });
    }
}
