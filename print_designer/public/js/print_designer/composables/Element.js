import { useMainStore } from "../store/MainStore";
import { useDraggable } from "./Draggable";
import { useResizable } from "./Resizable";
import { useDropZone } from "./DropZone";
import { watch, markRaw } from "vue";
import interact from "@interactjs/interact";
import {
	changeDraggable,
	changeResizable,
	changeDropZone,
	getSnapPointsAndEdges,
	getParentPage,
} from "../utils";

export function useElement({ draggable = true, resizable = true }) {
	const MainStore = useMainStore();
	const setReferance = (element) => (el) => {
		element.DOMRef = markRaw(el);
		el.piniaElementRef = element;
	};
	const setElements = (element, index) => (DOMElement) => {
		if (!element) return;
		element.index = index;
		if (element.DOMRef) return;
		if (element && DOMElement) {
			setReferance(element)(DOMElement);
			draggable && setDraggable(element);
			resizable && setResizable(element);
			const {
				rowSnapPoint,
				columnSnapPoint,
				leftSnapEdge,
				rightSnapEdge,
				topSnapEdge,
				bottomSnapEdge,
			} = getSnapPointsAndEdges(element);
			element.snapPoints = [rowSnapPoint, columnSnapPoint];
			element.snapEdges = [leftSnapEdge, rightSnapEdge, topSnapEdge, bottomSnapEdge];
			if (element.type == "rectangle" || element.type == "page") {
				setDropZone(element);
			}
			element && changeResizable(element);
			element && changeDraggable(element);
			element && changeDropZone(element);
			watch(
				() => [
					MainStore.page.width,
					MainStore.page.height,
					MainStore.page.marginTop,
					MainStore.page.marginBottom,
					MainStore.page.marginLeft,
					MainStore.page.marginRight,
				],
				() => {
					if (!element) return;
					if (interact.isSet(element.DOMRef)) {
						interact(element.DOMRef).unset();
					}
					draggable && setDraggable(element);
					resizable && setResizable(element);
				}
			);
			watch(
				() => [MainStore.activeControl, MainStore.isAltKey],
				() => {
					if (!element) return;
					if (MainStore.activeControl == "mouse-pointer") {
						if (element.type != "page") {
							element.isDraggable = true;
						}
						if (!MainStore.isAltKey) {
							element.isResizable = true;
							if (element.type == "rectangle" || element.type == "page") {
								element.isDropZone = true;
							}
						} else {
							element.isResizable = false;
							element.isDropZone = false;
						}
					} else {
						element.isDraggable = false;
						element.isResizable = false;
						element.isDropZone = false;
					}
				}
			);
			watch(
				() => element?.isResizable,
				() => {
					element && changeResizable(element);
				}
			);
			watch(
				() => element?.isDraggable,
				() => {
					element && changeDraggable(element);
				}
			);
			watch(
				() => element?.isDropZone,
				() => {
					element && changeDropZone(element);
				}
			);
		}
	};
	const setDraggable = (element) => {
		if (element.relativeContainer) return;
		const pageParent = getParentPage(element);
		if (!pageParent) {
			return;
		}
		const parentDOMRef = pageParent.DOMRef;
		useDraggable({
			element,
			restrict: parentDOMRef,
			dragMoveListener: (e) => {
				if (e.metaKey || e.ctrlKey) {
					e.interactable.options.drag.modifiers[0].disable();
				} else {
					e.interactable.options.drag.modifiers[0].enable();
				}

				let x = e.dx;
				let y = e.dy;
				if (MainStore.getCurrentElementsId.length < 1) {
					element.pageX = (parseFloat(element.pageX) || 0) + x;
					element.pageY = (parseFloat(element.pageY) || 0) + y;
					element.startX = (parseFloat(element.startX) || 0) + x;
					element.startY = (parseFloat(element.startY) || 0) + y;
				} else {
					MainStore.getCurrentElementsValues.forEach((currentElement) => {
						if (currentElement && currentElement.isDraggable) {
							currentElement.pageX = (parseFloat(currentElement.pageX) || 0) + x;
							currentElement.pageY = (parseFloat(currentElement.pageY) || 0) + y;
							currentElement.startX = (parseFloat(currentElement.startX) || 0) + x;
							currentElement.startY = (parseFloat(currentElement.startY) || 0) + y;
						}
					});
				}
				e.stopImmediatePropagation();
			},
			dragStartListener: (e) => {
				const parentRect =
					element.parent.DOMRef?.getBoundingClientRect() ||
					parentDOMRef.getBoundingClientRect();
				const elementRect = element.DOMRef.getBoundingClientRect();
				let offsetRect = MainStore.getCurrentElementsValues.reduce(
					(offset, currentElement) => {
						if (!currentElement) return offset;
						let currentElementRect = currentElement.DOMRef.getBoundingClientRect();
						currentElementRect.left < offset.left &&
							(offset.left = currentElementRect.left);
						currentElementRect.top < offset.top &&
							(offset.top = currentElementRect.top);
						currentElementRect.right > offset.right &&
							(offset.right = currentElementRect.right);
						currentElementRect.bottom > offset.bottom &&
							(offset.bottom = currentElementRect.bottom);
						return offset;
					},
					{ left: 9999, top: 9999, right: 0, bottom: 0 }
				);

				let restrictRect = {
					left:
						elementRect.left - offsetRect.left > 0
							? elementRect.left - offsetRect.left
							: 0,
					top:
						elementRect.top - offsetRect.top > 0
							? elementRect.top - offsetRect.top
							: 0,
					right:
						offsetRect.right - elementRect.right > 0
							? offsetRect.right - elementRect.right
							: 0,
					bottom:
						offsetRect.bottom - elementRect.bottom > 0
							? offsetRect.bottom - elementRect.bottom
							: 0,
				};
				elementPreviousZAxis = element.style.zIndex || 0;
				element.style.zIndex = 9999;
				const restrictionRect = {
					top: parentRect.top + restrictRect.top,
					left: parentRect.left + restrictRect.left,
					right: parentRect.right - restrictRect.right,
					bottom: parentRect.bottom - restrictRect.bottom,
				};
				if (MainStore.mode == "editing" && element.parent.type == "page") {
					restrictionRect.top += MainStore.page.headerHeight;
					restrictionRect.bottom -= MainStore.page.footerHeight;
				}
				e.interactable.options.drag.modifiers[0].options.restriction = restrictionRect;
			},
		});
	};
	const setResizable = (element) => {
		const pageParent = getParentPage(element);
		if (!pageParent) {
			return;
		}
		const parentDOMRef = pageParent.DOMRef;
		useResizable({
			element,
			restrict: parentDOMRef,
			resizeStartListener: (e) => {
				let parentRect = element.parent.DOMRef.getBoundingClientRect();
				const restrictionRect = {
					top: parentRect.top,
					left: parentRect.left,
					right: parentRect.right,
					bottom: parentRect.bottom,
				};
				if (MainStore.mode == "editing" && element.parent.type == "page") {
					restrictionRect.top += MainStore.page.headerHeight;
					restrictionRect.bottom -= MainStore.page.footerHeight;
				}
				e.interactable.options.resize.modifiers[0].options.outer = restrictionRect;
				if (!element.childrens || !element.childrens.length) return;
				let offsetRect = element.childrens.reduce(
					(offset, currentElement) => {
						if (!currentElement) return offset;
						let currentElementRect = currentElement.DOMRef.getBoundingClientRect();
						currentElementRect.left < offset.left &&
							(offset.left = currentElementRect.left);
						currentElementRect.top < offset.top &&
							(offset.top = currentElementRect.top);
						currentElementRect.right > offset.right &&
							(offset.right = currentElementRect.right);
						currentElementRect.bottom > offset.bottom &&
							(offset.bottom = currentElementRect.bottom);
						return offset;
					},
					{ left: 9999, top: 9999, right: 0, bottom: 0 }
				);
				e.interactable.options.resize.modifiers[0].options.inner = {
					top: offsetRect.top,
					left: offsetRect.left,
					right: offsetRect.right,
					bottom: offsetRect.bottom,
				};
			},
			resizeMoveListener: (e) => {
				if (element.type == "text") {
					element.isFixedSize = true;
				}
				if (e.metaKey || e.ctrlKey) {
					e.interactable.options.resize.modifiers[0].disable();
				} else {
					e.interactable.options.resize.modifiers[0].enable();
				}
				element.startX = (element.startX || 0) + e.deltaRect.left;
				element.startY = (element.startY || 0) + e.deltaRect.top;
				element.width = (element.width || 0) - e.deltaRect.left + e.deltaRect.right;
				element.height = (element.height || 0) - e.deltaRect.top + e.deltaRect.bottom;
				if (element.type == "rectangle" || element.type == "page") {
					element.childrens &&
						element.childrens.forEach((childEl) => {
							childEl.startX -= e.deltaRect.left;
							childEl.startY -= e.deltaRect.top;
						});
				}
			},
		});
	};
	const setDropZone = (element) => {
		useDropZone({
			element,
		});
	};
	return { setElements };
}
