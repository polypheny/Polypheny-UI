import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CrudService } from "../../../services/crud.service";
import { ToastService } from "../../toast/toast.service";
import { DbmsTypesService } from "../../../services/dbms-types.service";
import { BsModalService } from "ngx-bootstrap/modal";
import { DataViewComponent } from "../data-view.component";
import { WebuiSettingsService } from "../../../services/webui-settings.service";
import { LeftSidebarService } from "../../left-sidebar/left-sidebar.service";
import { Lightbox , LightboxConfig } from "ngx-lightbox";

@Component({
  selector: "app-data-card",
  templateUrl: "./data-card.component.html",
  styleUrls: ["./data-card.component.scss"],
})
export class DataCardComponent extends DataViewComponent implements OnInit {
  showInsertCard = false;
  jsonValid = false;
   album = [];


  

  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public _settings: WebuiSettingsService,
    public _sidebar: LeftSidebarService,
    public modalService: BsModalService,
    public  lightbox: Lightbox, public _lightboxConfig: LightboxConfig) {
    super(
      _crud,
      _toast,
      _route,
      _router,
      _types,
      _settings,
      _sidebar,
      modalService
    );
    // _lightboxConfig.fadeDuration = .3;



  }

  ngOnInit(): void {
    if (this.config && this.config.create) {
      this.buildInsertObject();
    }
    this.setPagination();
    this.loadAlbum();

  
  }

loadAlbum(){     
  for (var i = 0; i < this.resultSet.data.length; i++) {
      for (var j = 0; j < this.resultSet.header.length; j++) {
        if (
          this.resultSet.header[j].dataType === "IMAGE" ||
          this.resultSet.header[j].dataType === "VIDEO"
        ) {
          var info = "";
          // Concatenate information from all rows as caption
          for (var dataIndex = 0; dataIndex< this.resultSet.header.length; dataIndex++) {
            // Skip the row being used as the image source
            if (dataIndex !== j) {
          
              info +=  this.resultSet.header[dataIndex].name + " :  " +this.resultSet.data[i][dataIndex] + " , "; 
            }
          }

          const image = {
            src: this.getFileLink(this.resultSet.data[i][j]),
            caption: info, 
            thumb: ""
          };
          this.album.push(image);
        }
      }
    }
    console.log(this.album);
  
}

  setJsonValid($event: any) {
    this.jsonValid = $event;

  }

  showInsert() {
    this.editing = null;
    this.showInsertCard = true;
  }

  openLightbox(i: number): void {
    this.lightbox.open(this.album , i);
  }


  
}