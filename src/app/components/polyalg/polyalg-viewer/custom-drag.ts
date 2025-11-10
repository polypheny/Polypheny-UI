import {Drag} from 'rete-area-plugin';

/**
 * Enables to use horizontal scrolling for moving the area horizontally.
 */
export class CustomDrag extends Drag {
    constructor(private container: HTMLElement) {
        super();

        this.container.addEventListener('wheel', this.wheel);
    }

    private wheel = (e: WheelEvent) => {
        if (e.deltaX === 0) {
            return;
        }
        e.preventDefault();
        const startPosition = {...this.config.getCurrentPosition()};
        const zoom = this.config.getZoom();
        const x = startPosition.x - e.deltaX * 0.75 / zoom;
        void this.events.translate(x, startPosition.y, null);
    }

    public destroy() {
        this.container.removeEventListener('wheel', this.wheel);
        super.destroy();
    }
}
