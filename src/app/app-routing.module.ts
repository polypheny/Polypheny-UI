import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DefaultLayoutComponent} from './containers/default-layout';
import {P404Component} from './views/error/404.component';
import {P500Component} from './views/error/500.component';
import {LoginComponent} from './views/login/login.component';
import {TableSelectionDialogComponent} from './components/table-selection-dialog/table-selection-dialog.component';


export const routes: Routes = [
    {
        path: '404',
        component: P404Component,
        data: {
            title: 'Page 404'
        }
    },
    {
        path: '500',
        component: P500Component,
        data: {
            title: 'Page 500'
        }
    },
    {
        path: 'login',
        component: LoginComponent,
        data: {
            title: 'Login Page'
        }
    },
    {
      path: 'table-selection',
      component: TableSelectionDialogComponent,
      data: {
          title: 'Table Selection'
      }
    },
    {
        path: 'preview-selection',
        loadComponent: () => import('./components/preview-selection/preview-selection.component').then(m => m.PreviewSelectionComponent),
        data: {
            title: 'Preview Selection'
        }
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'views/monitoring'
    },
    {
        path: '',
        component: DefaultLayoutComponent,
        data: {
            title: 'Home'
        },
        children: [
            {
                path: 'views',
                loadChildren: () => import('./views/views.module').then(m => m.ViewsModule)
            }
        ]
    },
    {path: '**', component: P404Component}
];

@NgModule({
    imports: [
        RouterModule,
        RouterModule.forRoot(routes)
    ],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
