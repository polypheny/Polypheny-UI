import {Component, HostListener, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../toast/toast.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {DataViewComponent} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {first} from 'rxjs/operators';
import {RelationalResult} from '../models/result-set.model';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../../services/catalog.service';

@Component({
    selector: 'app-data-carousel',
    templateUrl: './data-carousel.component.html',
    styleUrls: ['./data-carousel.component.scss']
})
export class DataCarouselComponent extends DataViewComponent implements OnInit {

    currentSlide = 0;
    loadingPage = false;
    showInsert = false;

    @HostListener('window:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {
        if (this.currentSlide === this.editing) {
            return;
        }
        if (event.key === 'ArrowRight') {
            this.changeSlide(1);
        } else if (event.key === 'ArrowLeft') {
            this.changeSlide(-1);
        }
    }

    constructor(
        public _crud: CrudService,
        public _toast: ToastService,
        public _route: ActivatedRoute,
        public _router: Router,
        public _types: DbmsTypesService,
        public _settings: WebuiSettingsService,
        public _sidebar: LeftSidebarService,
        public _catalog: CatalogService,
        public modalService: BsModalService
    ) {
        super(_crud, _toast, _route, _router, _types, _settings, _sidebar, _catalog, modalService);
    }

    ngOnInit(): void {
    }


    /**
     * Change the slide
     * @param move +1 to move to the right, -1 to move to the left
     */
    changeSlide(move: number): void {
        if (this.loadingPage || !this.resultSet || !this.resultSet.data) {
            return;
        }
        if (move === 1) {
            if (this.currentSlide === this.resultSet.data.length - 1 && this.resultSet.currentPage < this.resultSet.highestPage) {
                this.resultSet.currentPage++;
                this.loadingPage = true;
                //subscribe before the getTable call
                this.resultSetEvent.pipe(first()).subscribe(() => {
                    this.currentSlide = 0;
                    this.loadingPage = false;
                });
                this.getTable();
            } else if (this.currentSlide !== this.resultSet.data.length - 1) {
                this.currentSlide++;
            }
        } else if (move === -1) {
            if (this.currentSlide === 0 && this.resultSet.currentPage !== 1) {
                this.resultSet.currentPage--;
                this.loadingPage = true;
                this.resultSetEvent.pipe(first()).subscribe(() => {
                    this.currentSlide = this.resultSet.data.length - 1;
                    this.loadingPage = false;
                });
                this.getTable();
            } else if (this.currentSlide !== 0) {
                this.currentSlide--;
            }
        }
    }

    insertRow() {
        super.insertRow().subscribe(
            res => {
                if (res) {
                    this.showInsert = false;
                }
            }
        );
        return null;
    }

    deleteRow(values: string[], i) {
        super.deleteRow(values, i).subscribe(
            res => {
                const result = <RelationalResult>res;
                if (!result.error) {
                    this.currentSlide = Math.max(0, this.currentSlide - 1);
                }
            }
        );
        return null;
    }

}
