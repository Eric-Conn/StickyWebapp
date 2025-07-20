document.addEventListener('DOMContentLoaded', () => {
    // ... setup and state declaration ...
    const app = document.getElementById('app');
    const canvas = document.getElementById('canvas');
    const DEFAULT_STICKY_WIDTH = 150, DEFAULT_STICKY_HEIGHT = 150, DEFAULT_TABLE_WIDTH = 300, DEFAULT_TABLE_HEIGHT = 200, PLACEMENT_PADDING = 20;
    let state = { pan: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, zoom: 1, isPanning: false, isDragging: false, isResizing: false, draggedItem: null, resizedItem: null, lastMousePosition: { x: 0, y: 0 }, nextItemId: 0, initialPinchDistance: null };
    const addStickyBtn = document.getElementById('addStickyBtn'), addTableBtn = document.getElementById('addTableBtn'), zoomInBtn = document.getElementById('zoomInBtn'), zoomOutBtn = document.getElementById('zoomOutBtn'), resetViewBtn = document.getElementById('resetViewBtn'), downloadBtn = document.getElementById('downloadBtn'), uploadBtn = document.getElementById('uploadBtn'), fileInput = document.getElementById('fileInput');

    // --- HELPER FUNCTIONS for Unified Input ---
    function getEventPosition(e) {
        if (e.touches && e.touches[0]) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function getPinchDistance(e) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
    }

    function getPinchCenter(e) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
    }

    // --- Core and Unchanged Functions ---
    function updateCanvasTransform() { canvas.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`; }
    // ... all other functions like createItem, setupTable, serializeCanvas, findEmptySpot, etc. remain the same ...
    function getCanvasCoords(clientX, clientY) { return { x: (clientX - state.pan.x) / state.zoom, y: (clientY - state.pan.y) / state.zoom }; }
    function doRectsOverlap(rect1, rect2) { return (rect1.x < rect2.x + rect2.width + PLACEMENT_PADDING && rect1.x + rect1.width + PLACEMENT_PADDING > rect2.x && rect1.y < rect2.y + rect2.height + PLACEMENT_PADDING && rect1.y + rect1.height + PLACEMENT_PADDING > rect2.y); }
    function findEmptySpot(startX, startY, width, height) { const existingItems = Array.from(canvas.querySelectorAll('.item')); const existingRects = existingItems.map(item => ({ x: item.offsetLeft, y: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight })); let candidatePos = { x: startX, y: startY }; const maxAttempts = 1000; const stepSize = 50; let leg = 0; let stepsInLeg = 1; let stepCount = 0; for (let i = 0; i < maxAttempts; i++) { const candidateRect = { x: candidatePos.x, y: candidatePos.y, width, height }; const isOverlapping = existingRects.some(rect => doRectsOverlap(candidateRect, rect)); if (!isOverlapping) { return candidatePos; } if (i === 0) { stepCount = 0; } switch (leg) { case 0: candidatePos.x += stepSize; break; case 1: candidatePos.y += stepSize; break; case 2: candidatePos.x -= stepSize; break; case 3: candidatePos.y -= stepSize; break; } stepCount++; if (stepCount >= stepsInLeg) { leg = (leg + 1) % 4; stepCount = 0; if (leg === 0 || leg === 2) { stepsInLeg++; } } } console.warn("Could not find an empty spot via spiral search."); return { x: startX, y: startY }; }
    function createItem(type, x, y, width, height) { const item = document.createElement('div'); item.id = `item-${state.nextItemId++}`; item.className = 'item'; item.style.left = `${x}px`; item.style.top = `${y}px`; item.style.width = `${width}px`; item.style.height = `${height}px`; const header = document.createElement('div'); header.className = 'item-header'; const title = document.createElement('span'); const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.innerHTML = '&times;'; deleteBtn.addEventListener('click', () => item.remove()); header.appendChild(title); header.appendChild(deleteBtn); item.appendChild(header); const content = document.createElement('div'); content.className = 'item-content'; item.appendChild(content); const resizeHandle = document.createElement('div'); resizeHandle.className = 'resize-handle'; item.appendChild(resizeHandle); if (type === 'sticky') { item.classList.add('sticky'); title.textContent = 'Sticky Note'; const textarea = document.createElement('textarea'); textarea.placeholder = 'Write something...'; content.replaceWith(textarea); } else if (type === 'table') { item.classList.add('table-container'); title.textContent = 'Table'; setupTable(item, content); } canvas.appendChild(item); return item; }
    function setupTable(tableContainer, content) { const table = document.createElement('table'); const thead = table.createTHead(); const tbody = table.createTBody(); const headerRow = thead.insertRow(); for (let i = 0; i < 2; i++) { const th = document.createElement('th'); th.textContent = `Header ${i + 1}`; headerRow.appendChild(th); } const bodyRow = tbody.insertRow(); for (let i = 0; i < 2; i++) { const cell = bodyRow.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } content.appendChild(table); const controls = document.createElement('div'); controls.className = 'table-controls'; controls.innerHTML = `<button class="add-row">+ Row</button><button class="add-col">+ Col</button><button class="remove-row">- Row</button><button class="remove-col">- Col</button>`; tableContainer.appendChild(controls); controls.querySelector('.add-row').addEventListener('click', () => { const newRow = tbody.insertRow(); const colCount = thead.rows[0].cells.length; for (let i = 0; i < colCount; i++) { const cell = newRow.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } }); controls.querySelector('.add-col').addEventListener('click', () => { const headerCell = document.createElement('th'); headerCell.textContent = `Header`; thead.rows[0].appendChild(headerCell); for(const row of tbody.rows) { const cell = row.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } }); controls.querySelector('.remove-row').addEventListener('click', () => { if (tbody.rows.length > 1) tbody.deleteRow(-1); }); controls.querySelector('.remove-col').addEventListener('click', () => { if (thead.rows[0].cells.length > 1) { thead.rows[0].deleteCell(-1); for(const row of tbody.rows) row.deleteCell(-1); } }); }
    function serializeCanvas() { const items = canvas.querySelectorAll('.item'); const data = Array.from(items).map(item => { const itemData = { id: item.id, type: item.classList.contains('sticky') ? 'sticky' : 'table', left: item.style.left, top: item.style.top, width: item.style.width, height: item.style.height, }; if (itemData.type === 'sticky') { itemData.content = item.querySelector('textarea').value; } else if (itemData.type === 'table') { const headers = Array.from(item.querySelectorAll('th')).map(th => th.textContent); const rows = Array.from(item.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent)); itemData.tableData = { headers, rows }; } return itemData; }); return JSON.stringify(data, null, 2); }
    function handleDownload() { const dataStr = serializeCanvas(); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'canvas-export.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function deserializeCanvas(jsonString) { try { const data = JSON.parse(jsonString); if (!Array.isArray(data)) throw new Error("Invalid data format."); canvas.innerHTML = ''; let maxId = 0; data.forEach(itemData => { const newItem = createItem(itemData.type, itemData.left, itemData.top, itemData.width, itemData.height); if (itemData.type === 'sticky') { newItem.querySelector('textarea').value = itemData.content; } else if (itemData.type === 'table') { const table = newItem.querySelector('table'); const thead = table.tHead; const tbody = table.tBodies[0]; thead.innerHTML = ''; tbody.innerHTML = ''; const headerRow = thead.insertRow(); itemData.tableData.headers.forEach(headerText => { const th = document.createElement('th'); th.textContent = headerText; headerRow.appendChild(th); }); itemData.tableData.rows.forEach(rowData => { const tr = tbody.insertRow(); rowData.forEach(cellText => { const td = tr.insertCell(); td.textContent = cellText; td.setAttribute('contenteditable', 'true'); }); }); } const idNum = parseInt(itemData.id.split('-')[1], 10); if (idNum > maxId) { maxId = idNum; } }); state.nextItemId = maxId + 1; resetViewBtn.click(); } catch (error) { console.error("Failed to load canvas:", error); alert("Could not load file. It may be corrupted or in the wrong format."); } }
    function handleUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const content = e.target.result; deserializeCanvas(content); }; reader.readAsText(file); event.target.value = null; }

    // --- REFACTORED: Unified Event Listeners ---
    function handleInteractionStart(e) {
        if (e.touches && e.touches.length === 2) {
            state.initialPinchDistance = getPinchDistance(e);
            return;
        }

        const pos = getEventPosition(e);
        state.lastMousePosition = pos;
        
        const item = e.target.closest('.item');
        if (item) {
            if (e.target.closest('.item-header')) {
                state.isDragging = true;
                state.draggedItem = item;
                // For touch, we need to calculate offset relative to canvas coords
                const itemRect = item.getBoundingClientRect();
                const itemCanvasX = (itemRect.left - state.pan.x) / state.zoom;
                const itemCanvasY = (itemRect.top - state.pan.y) / state.zoom;
                const touchCanvasPos = getCanvasCoords(pos.x, pos.y);
                state.dragOffset = { x: touchCanvasPos.x - itemCanvasX, y: touchCanvasPos.y - itemCanvasY };
                item.style.zIndex = state.nextItemId++;
            } else if (e.target.classList.contains('resize-handle')) {
                state.isResizing = true;
                state.resizedItem = item;
            }
        } else {
            state.isPanning = true;
            app.style.cursor = 'grabbing';
        }
    }

    function handleInteractionMove(e) {
        if (state.isPanning || state.isDragging || state.isResizing || (e.touches && e.touches.length > 0)) {
            e.preventDefault(); // Prevent page scroll on mobile
        }

        if (e.touches && e.touches.length === 2) { // Pinch-to-zoom
            if (state.initialPinchDistance === null) return;
            const newDist = getPinchDistance(e);
            const zoomFactor = newDist / state.initialPinchDistance;
            const oldZoom = state.zoom;
            state.zoom = Math.max(0.2, Math.min(4, state.zoom * zoomFactor));

            // Zoom towards pinch center
            const pinchCenter = getPinchCenter(e);
            const mouseX = pinchCenter.x - state.pan.x;
            const mouseY = pinchCenter.y - state.pan.y;
            state.pan.x = pinchCenter.x - mouseX * (state.zoom / oldZoom);
            state.pan.y = pinchCenter.y - mouseY * (state.zoom / oldZoom);

            state.initialPinchDistance = newDist;
            updateCanvasTransform();
            return;
        }

        const pos = getEventPosition(e);
        const dx = pos.x - state.lastMousePosition.x;
        const dy = pos.y - state.lastMousePosition.y;
        state.lastMousePosition = pos;

        if (state.isPanning) {
            state.pan.x += dx;
            state.pan.y += dy;
            updateCanvasTransform();
        } else if (state.isDragging && state.draggedItem) {
            const touchCanvasPos = getCanvasCoords(pos.x, pos.y);
            state.draggedItem.style.left = `${touchCanvasPos.x - state.dragOffset.x}px`;
            state.draggedItem.style.top = `${touchCanvasPos.y - state.dragOffset.y}px`;
        } else if (state.isResizing && state.resizedItem) {
            const newWidth = state.resizedItem.offsetWidth + (dx / state.zoom);
            const newHeight = state.resizedItem.offsetHeight + (dy / state.zoom);
            state.resizedItem.style.width = `${newWidth}px`;
            state.resizedItem.style.height = `${newHeight}px`;
        }
    }

    function handleInteractionEnd(e) {
        state.isPanning = false;
        state.isDragging = false;
        state.isResizing = false;
        state.draggedItem = null;
        state.resizedItem = null;
        state.initialPinchDistance = null;
        app.style.cursor = 'grab';
    }

    // Desktop mouse-wheel zoom
    app.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const oldZoom = state.zoom;
        if (e.deltaY < 0) { state.zoom = Math.min(4, state.zoom + zoomSpeed); } 
        else { state.zoom = Math.max(0.2, state.zoom - zoomSpeed); }
        const mouseX = e.clientX - state.pan.x;
        const mouseY = e.clientY - state.pan.y;
        state.pan.x = e.clientX - mouseX * (state.zoom / oldZoom);
        state.pan.y = e.clientY - mouseY * (state.zoom / oldZoom);
        updateCanvasTransform();
    });

    // Add all event listeners
    app.addEventListener('mousedown', handleInteractionStart);
    app.addEventListener('touchstart', handleInteractionStart, { passive: false });
    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('touchmove', handleInteractionMove, { passive: false });
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);

    // Toolbar Actions
    addStickyBtn.addEventListener('click', () => { const center = getCanvasCoords(window.innerWidth / 2, window.innerHeight / 2); const spawnPos = findEmptySpot(center.x - DEFAULT_STICKY_WIDTH / 2, center.y - DEFAULT_STICKY_HEIGHT / 2, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT); createItem('sticky', spawnPos.x, spawnPos.y, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT); });
    addTableBtn.addEventListener('click', () => { const center = getCanvasCoords(window.innerWidth / 2, window.innerHeight / 2); const spawnPos = findEmptySpot(center.x - DEFAULT_TABLE_WIDTH / 2, center.y - DEFAULT_TABLE_HEIGHT / 2, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT); createItem('table', spawnPos.x, spawnPos.y, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT); });
    zoomInBtn.addEventListener('click', () => { state.zoom = Math.min(4, state.zoom + 0.2); updateCanvasTransform(); });
    zoomOutBtn.addEventListener('click', () => { state.zoom = Math.max(0.2, state.zoom - 0.2); updateCanvasTransform(); });
    resetViewBtn.addEventListener('click', () => { state.zoom = 1; state.pan = { x: window.innerWidth / 4, y: window.innerHeight / 4 }; updateCanvasTransform(); });
    downloadBtn.addEventListener('click', handleDownload);
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleUpload);

    initialize();
    function initialize() {
        createItem('sticky', 100, 100, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT);
        createItem('table', 400, 150, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT);
        updateCanvasTransform();
    }
});