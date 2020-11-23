import {Component, HostListener, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../toast/toast.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {UtilService} from '../../../services/util.service';
import {DataViewComponent} from '../data-view.component';

@Component({
  selector: 'app-data-carousel',
  templateUrl: './data-carousel.component.html',
  styleUrls: ['./data-carousel.component.scss']
})
export class DataCarouselComponent extends DataViewComponent implements OnInit {

  currentSlide = 0;

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if(event.key === 'ArrowRight'){
      this.changeSlide(1);
    }
    else if(event.key === 'ArrowLeft'){
      this.changeSlide(-1);
    }
  }

  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public modalService: BsModalService,
    public _util: UtilService
  ) {
    super( _crud, _toast, _route, _router, _types, modalService );
  }

  ngOnInit(): void { }


  /**
   * Change the slide
   * @param move +1 to move to the right, -1 to move to the left
   */
  changeSlide ( move: number ): void {
    if( !this.resultSet || !this.resultSet.data ) {
      return;
    } else {
      const n = this.resultSet.data.length;
      this.currentSlide = this._util.mod( this.currentSlide + move, n );
    }
  }

}
