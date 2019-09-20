import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphComponent } from './graph/graph.component';
import { ChartsModule } from 'ng2-charts';
import {CollapseModule, ProgressbarModule, TabsModule, TooltipModule, TypeaheadModule} from 'ngx-bootstrap';
import { ToastComponent } from './toast/toast.component';

import { AppBreadcrumbModule } from '@coreui/angular';

import {BreadcrumbComponent} from './breadcrumb/breadcrumb.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LeftSidebarComponent} from './left-sidebar/left-sidebar.component';
import {TreeModule} from 'angular-tree-component';
import {RightSidebarComponent} from './right-sidebar/right-sidebar.component';
import {RouterModule} from '@angular/router';
import {DataTableComponent} from './data-table/data-table.component';
import {DynamicFormsComponent} from './dynamic-forms/dynamic-forms.component';
import {RenderItemComponent} from './information-manager/render-item/render-item.component';
import {InformationManagerComponent} from './information-manager/information-manager.component';
import { InputComponent } from './data-table/input/input.component';
import { EditorComponent } from './editor/editor.component';
import {ExplainVisualizerModule} from '../explain-visualizer/explain-visualizer.module';
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
    ExplainVisualizerModule
  ],
  declarations: [
    BreadcrumbComponent,
    DataTableComponent,
    DynamicFormsComponent,
    GraphComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    ToastComponent,
    InformationManagerComponent,
    RenderItemComponent,
    InputComponent,
    EditorComponent
  ],
  exports: [
    BreadcrumbComponent,
    DataTableComponent,
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
