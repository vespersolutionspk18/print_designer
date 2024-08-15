import interact from "@interactjs/interact";
import "@interactjs/actions/drop";
import "@interactjs/auto-start";
import "@interactjs/modifiers";
import { useMainStore } from "../store/MainStore";
import { recursiveChildrens } from "../utils";

export function useDropZone({ element }) {
	const MainStore = useMainStore();
	if (interact.isSet(element["DOMRef"]) && interact(element["DOMRef"]).dropzone().enabled)
		return;
	interact(element.DOMRef).dropzone({
		ignoreFrom: ".dropzone",
		overlap: 1,
		ondrop: (event) => {
			let currentRef = event.draggable.target.piniaElementRef;
			let currentDROP = event.dropzone.target.piniaElementRef;
			let currentRect = event.draggable.target.getBoundingClientRect();
			let dropRect = event.dropzone.target.getBoundingClientRect();
			if (currentDROP === currentRef.parent) return;
			let splicedElement = currentRef.parent.childrens.splice(currentRef.index, 1)[0];
			splicedElement = { ...splicedElement };
			splicedElement.startX = currentRect.left - dropRect.left;
			splicedElement.startY = currentRect.top - dropRect.top;
			splicedElement.parent = currentDROP;
			recursiveChildrens({ element: splicedElement, isClone: false });
			currentDROP.childrens.push(splicedElement);
			let droppedElement = new Object();
			droppedElement[splicedElement.id] = splicedElement;
			MainStore.isDropped = droppedElement;
		},
	});
	return;
}
