import {Component, inject, OnInit} from '@angular/core';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {HttpClient} from '@angular/common/http';

@Component({
    selector: 'app-inventory',
    templateUrl: './inventory.component.html',
    styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {

    dataString: string | null = null;
    errorMessage: string | null = null;

    private readonly _sidebar = inject(LeftSidebarService);

    constructor(private http: HttpClient) {
        this.getData();
    }

    ngOnInit() {
        this._sidebar.hide();
    }

    getData(): void {
        this.http.get<string>('/inventory/test')
            .subscribe(
                (response: string) => {
                    this.dataString = response; // Store the response string
                },
                (error) => {
                    this.errorMessage = 'Error fetching data'; // Handle error scenario
                    console.error('Error:', error);
                }
            );
    }


}
