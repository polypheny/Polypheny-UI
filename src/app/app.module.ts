import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {HashLocationStrategy, LocationStrategy, NgOptimizedImage} from '@angular/common';

import {FormsModule, ReactiveFormsModule} from '@angular/forms';

// coreui / bootstrap imports
import {TooltipModule} from 'ngx-bootstrap/tooltip';
// tree-module
import {AppComponent} from './app.component';

// Import routing module
import {AppRoutingModule} from './app-routing.module';

// Import 3rd party components
import {TypeaheadModule} from 'ngx-bootstrap/typeahead';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {NgChartsModule} from 'ng2-charts';
import {HttpClientModule} from '@angular/common/http';
import {ComponentsModule} from './components/components.module';
import {
    BreadcrumbComponent,
    ColComponent,
    ContainerComponent,
    DropdownComponent,
    DropdownItemDirective,
    DropdownMenuDirective,
    DropdownToggleDirective,
    FooterComponent,
    GutterDirective,
    HeaderBrandComponent,
    HeaderComponent,
    HeaderDividerComponent,
    HeaderNavComponent,
    HeaderTextComponent,
    HeaderTogglerDirective,
    NavItemComponent,
    NavLinkDirective,
    ProgressBarComponent,
    ProgressComponent,
    RowComponent,
    SidebarComponent,
    SidebarNavComponent,
    SidebarToggleDirective,
    SidebarTogglerComponent,
    ToastBodyComponent,
    ToastCloseDirective,
    ToastComponent,
    ToasterComponent,
    ToastHeaderComponent
} from '@coreui/angular';
import {DefaultLayoutComponent} from './containers/default-layout';
import {P404Component} from './views/error/404.component';
import {P500Component} from './views/error/500.component';
import {LoginComponent} from './views/login/login.component';
import {ViewsModule} from './views/views.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {ModalModule} from 'ngx-bootstrap/modal';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {IconDirective} from '@coreui/icons-angular';


@NgModule({
    imports: [
        ComponentsModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        BrowserModule,
        BsDropdownModule.forRoot(),
        TabsModule.forRoot(),
        ToastComponent,
        NgChartsModule,
        ToasterComponent,
        // coreui / bootstrap
        TooltipModule.forRoot(),
        // forms
        FormsModule,
        ReactiveFormsModule,
        BsDropdownModule,
        TypeaheadModule.forRoot(),
        HttpClientModule,
        ViewsModule,
        PopoverModule.forRoot(),
        ModalModule.forRoot(),
        NgxJsonViewerModule,
        FooterComponent,
        HeaderComponent,
        ContainerComponent,
        HeaderDividerComponent,
        HeaderBrandComponent,
        HeaderNavComponent,
        NavItemComponent,
        DropdownToggleDirective,
        DropdownComponent,
        NavLinkDirective,
        HeaderTextComponent,
        SidebarComponent,
        SidebarToggleDirective,
        NgOptimizedImage,
        DropdownItemDirective,
        DropdownMenuDirective,
        HeaderTogglerDirective,
        SidebarTogglerComponent,
        SidebarNavComponent,
        IconDirective,
        RowComponent,
        ColComponent,
        GutterDirective,
        ToastHeaderComponent,
        BreadcrumbComponent,
        ProgressComponent,
        ToastBodyComponent,
        ToastHeaderComponent,
        ProgressBarComponent,
        ToastCloseDirective,
        ToasterComponent
    ],
    declarations: [
        AppComponent,
        DefaultLayoutComponent,
        P404Component,
        P500Component,
        LoginComponent
    ],
    providers: [{
        provide: LocationStrategy,
        useClass: HashLocationStrategy
    }],
    bootstrap: [AppComponent],
    exports: []
})
export class AppModule {
}
