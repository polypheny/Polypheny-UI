export class SidebarButton {
  name: string;
  isOutline: boolean;
  clickEvent: ($event?) => any;

  constructor(name: string, clickEvent: ($event?) => any, isOutline = false) {
    this.name = name;
    this.clickEvent = clickEvent;
    this.isOutline = isOutline;
  }
}
