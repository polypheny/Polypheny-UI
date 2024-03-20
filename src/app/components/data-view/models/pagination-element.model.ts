/**
 * model for the pagination in the data-table component
 */
export class PaginationElement {
    page: number;
    label: string;
    active = false;
    disabled = false;
    routerLink: string;

    withPage(tableId: number, page: number) {
        this.page = page;
        this.label = page.toString();
        this.routerLink = '/views/data-table/' + tableId + '/' + page;
        return this;
    }

    withLabel(label: string) {
        this.label = label;
        return this;
    }

    setActive() {
        this.active = true;
        return this;
    }

    setDisabled() {
        this.disabled = true;
        return this;
    }
}
