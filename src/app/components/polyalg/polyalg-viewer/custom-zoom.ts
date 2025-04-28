import {Zoom} from 'rete-area-plugin';
import {OnZoom} from 'rete-area-plugin/_types/zoom';
import {document} from 'ngx-bootstrap/utils';
import {debounceTime, filter, fromEvent, Subscription} from 'rxjs';
import {tap} from 'rxjs/operators';

/**
 * Improves intensity for touchpad zooming and adds the possibility to require CTRL being pressed for the zoom to have an effect.
 */
export class CustomZoom extends Zoom {
    private readonly m: number;
    private readonly b: number;
    private overlay: HTMLDivElement = null;
    private wheelSubscription: Subscription;

    constructor(
        intensity: number,
        trackPadIntensity: number = 0.3,
        private requireCtrl: boolean = false) {
        super(intensity);
        this.b = Math.max(0, Math.min(trackPadIntensity, 1));
        this.m = 1 - this.b;
    }


    initialize(container: HTMLElement, element: HTMLElement, onzoom: OnZoom) {
        super.initialize(container, element, onzoom);
        if (this.requireCtrl) {
            this.initOverlay();
            this.wheelSubscription = fromEvent<WheelEvent>(container, 'wheel').pipe(
                // Only consider the event if Ctrl key is not pressed
                filter((event) => !event.ctrlKey),
                tap(() => this.overlay.style.display = 'flex'),
                debounceTime(1500),
                tap(() => this.overlay.style.display = 'none')
            ).subscribe();
        }
    }

    protected wheel = (e: WheelEvent) => {
        if (this.requireCtrl) {
            if (e.ctrlKey) {
                this.overlay.style.display = 'none';
            } else {
                return;
            }
        }
        e.preventDefault();

        const {left, top} = this.element.getBoundingClientRect();

        let deltaAbs = Math.abs(e.deltaY) / 100;
        if (0.01 < deltaAbs && deltaAbs < 1) {
            deltaAbs = this.m * deltaAbs + this.b; // linearly increase intensity of small values that indicate a touchpad gesture is used
        }
        deltaAbs = deltaAbs * this.intensity;

        const delta = e.deltaY < 0 ? deltaAbs : -deltaAbs;
        const ox = (left - e.clientX) * delta;
        const oy = (top - e.clientY) * delta;

        this.onzoom(delta, ox, oy, 'wheel');
    }


    destroy() {
        super.destroy();
        this.wheelSubscription?.unsubscribe();
    }

    private initOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'zoom-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.color = 'white';
        overlay.style.fontSize = '24px';
        overlay.style.display = 'none'; // Hide by default
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';

        // Add the message text
        const message = document.createElement('div');
        message.innerText = 'Use ctrl / ⌘ + scroll to zoom';
        overlay.appendChild(message);

        // Append the overlay to the container
        this.container.appendChild(overlay);
        this.overlay = overlay;
    }
}
