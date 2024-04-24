import {BaseSchemes} from "rete";
import {AreaPlugin} from "rete-area-plugin";

export function addCustomBackground<S extends BaseSchemes, K>(
    area: AreaPlugin<S, K>
) {
    const background = document.createElement("div");

    background.classList.add("background");
    background.classList.add("fill-area");

    background.style.display = "table";
    background.style.zIndex = "-1";
    background.style.position = "absolute";
    background.style.top = "-320000px";
    background.style.left = "-320000px";
    background.style.width = "640000px";
    background.style.height = "640000px";

    // Apply background styles
    background.style.backgroundColor = "#ffffff";
    background.style.opacity = "1";
    background.style.backgroundImage = "radial-gradient(circle at 2px 2px, #ccc 2px, transparent 0)";
    background.style.backgroundSize = "50px 50px";


    area.area.content.add(background);
}