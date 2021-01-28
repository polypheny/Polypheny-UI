import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GraphComponent} from './graph/graph.component';
import {ChartsModule} from 'ng2-charts';
import {ToastComponent} from './toast/toast.component';

import {AppBreadcrumbModule} from '@coreui/angular';

import {BreadcrumbComponent} from './breadcrumb/breadcrumb.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LeftSidebarComponent} from './left-sidebar/left-sidebar.component';
import {TreeModule} from 'angular-tree-component';
import {RightSidebarComponent} from './right-sidebar/right-sidebar.component';
import {RouterModule} from '@angular/router';
import {DataTableComponent} from './data-view/data-table/data-table.component';
import {DynamicFormsComponent} from './dynamic-forms/dynamic-forms.component';
import {RenderItemComponent} from './information-manager/render-item/render-item.component';
import {InformationManagerComponent} from './information-manager/information-manager.component';
import {InputComponent} from './data-view/input/input.component';
import {EditorComponent} from './editor/editor.component';
import {ExplainVisualizerModule} from '../explain-visualizer/explain-visualizer.module';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {ProgressbarModule} from 'ngx-bootstrap/progressbar';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {TypeaheadModule} from 'ngx-bootstrap/typeahead';
import {DataCardComponent} from './data-view/data-card/data-card.component';
import {DataCarouselComponent} from './data-view/data-carousel/data-carousel.component';
import {CarouselModule} from 'ngx-bootstrap/carousel';
import { DataViewComponent } from './data-view/data-view.component';
import {PlyrModule} from 'ngx-plyr';
import { MediaComponent } from './data-view/media/media.component';

//import 'hammerjs';

@NgModule({
  imports: [
    //AppRoutingModule,
    RouterModule,
    CommonModule,
    ChartsModule,
    TypeaheadModule.forRoot(),
    AppBreadcrumbModule.forRoot(),
    TreeModule,
    TabsModule.forRoot(),
    // forms
    FormsModule, ReactiveFormsModule,
    CollapseModule,
    TooltipModule,
    ProgressbarModule.forRoot(),
    ExplainVisualizerModule,
    ModalModule.forRoot(),
    CarouselModule,
    PlyrModule
  ],
  declarations: [
    BreadcrumbComponent,
    DynamicFormsComponent,
    GraphComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    ToastComponent,
    InformationManagerComponent,
    RenderItemComponent,
    InputComponent,
    EditorComponent,
    DataViewComponent,
    DataCardComponent,
    DataTableComponent,
    DataCarouselComponent,
    MediaComponent
  ],
  exports: [
    BreadcrumbComponent,
    DataViewComponent,
    DataTableComponent,
    DataCardComponent,
    DataCarouselComponent,
    DynamicFormsComponent,
    GraphComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    ToastComponent,
    InformationManagerComponent,
    InputComponent,
    EditorComponent
  ]
})
export class ComponentsModule { }
