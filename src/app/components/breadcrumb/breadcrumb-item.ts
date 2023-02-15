export class BreadcrumbItem {
    name: string;
    routerLink?: any;

    constructor(name: string, routerLink?: any) {
        this.name = name;
        if (routerLink) {
            this.routerLink = routerLink;
        }
    }
}
