import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LogoutComponent } from './logout.component';
// Search
import { appRouter } from '../../constants/appRouter';

// async components must be named routes for WebpackAsyncRoute
const routes: Routes = [
    {path: appRouter.empty, component: LogoutComponent}
];

@NgModule({
    declarations: [
        LogoutComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
    ],
    exports: []
})
export class LogoutModule {
    public static routes = routes;
}
