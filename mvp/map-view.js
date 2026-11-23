const zoomSteps = [1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5];
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function createMapView(map, {zoomIn, zoomOut, reset, display}) {
  let layer;
  let zoom = 1;
  let x = 0;
  let y = 0;
  let suppressClick = false;
  let dragOrigin;
  const pointers = new Map();

  function render() {
    if (!layer) return;
    const maxX = Math.max(0, (layer.offsetWidth * zoom - map.clientWidth) / 2);
    const maxY = Math.max(0, (layer.offsetHeight * zoom - map.clientHeight) / 2);
    x = clamp(x, -maxX, maxX);
    y = clamp(y, -maxY, maxY);
    layer.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    map.classList.toggle('is-zoomed', zoom > 1);
    zoomIn.disabled = zoom >= zoomSteps.at(-1);
    zoomOut.disabled = zoom <= 1;
    reset.disabled = zoom <= 1;
    display.value = `${Math.round(zoom * 100)}%`;
  }

  function center() {
    const {left, top, width, height} = map.getBoundingClientRect();
    return {x: left + width / 2, y: top + height / 2};
  }

  function zoomAt(next, anchor = center()) {
    const origin = center();
    const scale = clamp(next, 1, zoomSteps.at(-1));
    const ratio = scale / zoom;
    x = anchor.x - origin.x - (anchor.x - origin.x - x) * ratio;
    y = anchor.y - origin.y - (anchor.y - origin.y - y) * ratio;
    zoom = scale;
    render();
  }

  function step(direction) {
    const next = direction > 0
      ? zoomSteps.find(value => value > zoom + .001)
      : zoomSteps.findLast(value => value < zoom - .001);
    if (next !== undefined) zoomAt(next);
  }

  function resetView() {
    zoom = 1;
    x = 0;
    y = 0;
    render();
  }

  function midpoint(first, second) {
    return {x: (first.x + second.x) / 2, y: (first.y + second.y) / 2};
  }

  const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

  map.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    if (!pointers.size) {
      suppressClick = false;
      dragOrigin = {x: event.clientX, y: event.clientY};
    }
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pointers.size === 2) suppressClick = true;
  });

  map.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const current = {x: event.clientX, y: event.clientY};
    pointers.set(event.pointerId, current);
    const partner = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (partner) {
      const oldDistance = distance(previous, partner);
      if (oldDistance < 1) return;
      const anchor = midpoint(previous, partner);
      const nextAnchor = midpoint(current, partner);
      zoomAt(zoom * distance(current, partner) / oldDistance, anchor);
      x += nextAnchor.x - anchor.x;
      y += nextAnchor.y - anchor.y;
    } else {
      if (zoom === 1 || (!suppressClick && distance(current, dragOrigin) < 5)) return;
      x += current.x - previous.x;
      y += current.y - previous.y;
    }
    suppressClick = true;
    if (event.pointerType === 'mouse' && !map.hasPointerCapture(event.pointerId)) {
      map.setPointerCapture(event.pointerId);
    }
    map.classList.add('is-dragging');
    render();
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    dragOrigin = pointers.values().next().value;
    if (!pointers.size) map.classList.remove('is-dragging');
  }

  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    map.addEventListener(event, endPointer);
  }
  map.addEventListener('pointerleave', event => {
    if (!map.hasPointerCapture(event.pointerId)) endPointer(event);
  });
  map.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);
  map.addEventListener('dblclick', event => {
    if (event.target.closest('button')) return;
    zoomAt(zoom * 1.5, {x: event.clientX, y: event.clientY});
  });
  map.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAt(zoom * Math.exp(-clamp(event.deltaY, -160, 160) * .003), {x: event.clientX, y: event.clientY});
  }, {passive: false});
  map.addEventListener('keydown', event => {
    if (event.target !== map) return;
    const offsets = {ArrowLeft: [90, 0], ArrowRight: [-90, 0], ArrowUp: [0, 90], ArrowDown: [0, -90]};
    if (event.key === '+' || event.key === '=') step(1);
    else if (event.key === '-' || event.key === '−') step(-1);
    else if (event.key === 'Home') resetView();
    else if (zoom > 1 && Object.hasOwn(offsets, event.key)) {
      x += offsets[event.key][0];
      y += offsets[event.key][1];
      render();
    } else return;
    event.preventDefault();
  });

  map.addEventListener('focusin', event => {
    if (zoom === 1 || !event.target.matches('button:focus-visible')) return;
    const view = map.getBoundingClientRect();
    const button = event.target.getBoundingClientRect();
    if (button.left < view.left) x += view.left - button.left + 8;
    else if (button.right > view.right) x -= button.right - view.right + 8;
    if (button.top < view.top) y += view.top - button.top + 8;
    else if (button.bottom > view.bottom) y -= button.bottom - view.bottom + 8;
    render();
  });

  zoomIn.addEventListener('click', () => step(1));
  zoomOut.addEventListener('click', () => step(-1));
  reset.addEventListener('click', resetView);
  new ResizeObserver(render).observe(map);

  return {
    show(nextLayer) {
      if (layer && layer !== nextLayer) layer.style.removeProperty('transform');
      layer = nextLayer;
      pointers.clear();
      map.classList.remove('is-dragging');
      resetView();
    },
  };
}
