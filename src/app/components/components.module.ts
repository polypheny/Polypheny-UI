import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GraphComponent} from './graph/graph.component';
import {NgChartsModule} from 'ng2-charts';

import {BgColorDirective, ColComponent, RowComponent, ToastComponent} from '@coreui/angular';

import {BreadcrumbComponent} from './breadcrumb/breadcrumb.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LeftSidebarComponent} from './left-sidebar/left-sidebar.component';
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
import {DataViewComponent} from './data-view/data-view.component';
import {MediaComponent} from './data-view/media/media.component';
import {DeleteConfirmComponent} from './delete-confirm/delete-confirm.component';
import {ExpandableTextComponent} from './data-view/expandable-text/expandable-text.component';
import {JsonTextComponent} from './data-view/json-text/json-text.component';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {JsonEditorComponent} from './json/json-editor.component';
import {JsonElemComponent} from './json/json-elem/json-elem.component';
import {DataGraphComponent} from './data-view/data-graph/data-graph.component';
import {DatesPipeModule} from './data-view/shared-module';
import {DockereditComponent} from './dockeredit/dockeredit.component';
import {DockerhandshakeComponent} from './dockerhandshake/dockerhandshake.component';
import {DockernewComponent} from './dockernew/dockernew.component';
import {DockersettingsComponent} from './dockersettings/dockersettings.component';
import {TreeModule} from '@ali-hm/angular-tree-component';

//import 'hammerjs';

@NgModule({
    imports: [
        //AppRoutingModule,
        RouterModule,
        CommonModule,
        NgChartsModule,
        TypeaheadModule.forRoot(),
        TabsModule.forRoot(),
        // forms
        FormsModule, ReactiveFormsModule,
        CollapseModule,
        TooltipModule,
        ProgressbarModule.forRoot(),
        ExplainVisualizerModule,
        ModalModule.forRoot(),
        CarouselModule,
        NgxJsonViewerModule,
        DatesPipeModule,
        ToastComponent,
        BgColorDirective,
        TreeModule, RowComponent, ColComponent
    ],
    declarations: [
        BreadcrumbComponent,
        DynamicFormsComponent,
        GraphComponent,
        LeftSidebarComponent,
        RightSidebarComponent,
        InformationManagerComponent,
        RenderItemComponent,
        InputComponent,
        EditorComponent,
        JsonEditorComponent,
        DataViewComponent,
        DataCardComponent,
        DataTableComponent,
        DataGraphComponent,
        DataCarouselComponent,
        MediaComponent,
        DeleteConfirmComponent,
        ExpandableTextComponent,
        JsonTextComponent,
        JsonElemComponent,
        DockereditComponent,
        DockerhandshakeComponent,
        DockernewComponent,
        DockersettingsComponent,
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
        JsonEditorComponent,
        EditorComponent,
        DeleteConfirmComponent,
        DockereditComponent,
        DockerhandshakeComponent,
        DockernewComponent,
        DockersettingsComponent,
    ]
})
export class ComponentsModule {
}
