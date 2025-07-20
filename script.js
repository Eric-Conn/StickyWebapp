document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const canvas = document.getElementById('canvas');

    const DEFAULT_STICKY_WIDTH = 150;
    const DEFAULT_STICKY_HEIGHT = 150;
    const DEFAULT_TABLE_WIDTH = 300;
    const DEFAULT_TABLE_HEIGHT = 200;
    const PLACEMENT_PADDING = 20;

    let state = {
        pan: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        zoom: 1,
        isPanning: false,
        isDragging: false,
        isResizing: false,
        draggedItem: null,
        resizedItem: null,
        lastMousePosition: { x: 0, y: 0 },
        nextItemId: 0
    };

    const addStickyBtn = document.getElementById('addStickyBtn');
    const addTableBtn = document.getElementById('addTableBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    function updateCanvasTransform() { canvas.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`; }
    function getCanvasCoords(clientX, clientY) { return { x: (clientX - state.pan.x) / state.zoom, y: (clientY - state.pan.y) / state.zoom }; }
    function doRectsOverlap(rect1, rect2) { return (rect1.x < rect2.x + rect2.width + PLACEMENT_PADDING && rect1.x + rect1.width + PLACEMENT_PADDING > rect2.x && rect1.y < rect2.y + rect2.height + PLACEMENT_PADDING && rect1.y + rect1.height + PLACEMENT_PADDING > rect2.y); }
    function findEmptySpot(startX, startY, width, height) { const existingItems = Array.from(canvas.querySelectorAll('.item')); const existingRects = existingItems.map(item => ({ x: item.offsetLeft, y: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight })); let candidatePos = { x: startX, y: startY }; const maxAttempts = 1000; const stepSize = 50; let leg = 0; let stepsInLeg = 1; let stepCount = 0; for (let i = 0; i < maxAttempts; i++) { const candidateRect = { x: candidatePos.x, y: candidatePos.y, width, height }; const isOverlapping = existingRects.some(rect => doRectsOverlap(candidateRect, rect)); if (!isOverlapping) { return candidatePos; } if (i === 0) { stepCount = 0; } switch (leg) { case 0: candidatePos.x += stepSize; break; case 1: candidatePos.y += stepSize; break; case 2: candidatePos.x -= stepSize; break; case 3: candidatePos.y -= stepSize; break; } stepCount++; if (stepCount >= stepsInLeg) { leg = (leg + 1) % 4; stepCount = 0; if (leg === 0 || leg === 2) { stepsInLeg++; } } } console.warn("Could not find an empty spot via spiral search."); return { x: startX, y: startY }; }
    function createItem(type, x, y, width, height) { const item = document.createElement('div'); item.id = `item-${state.nextItemId++}`; item.className = 'item'; item.style.left = `${x}px`; item.style.top = `${y}px`; item.style.width = `${width}px`; item.style.height = `${height}px`; const header = document.createElement('div'); header.className = 'item-header'; const title = document.createElement('span'); const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.innerHTML = '&times;'; deleteBtn.addEventListener('click', () => item.remove()); header.appendChild(title); header.appendChild(deleteBtn); item.appendChild(header); const content = document.createElement('div'); content.className = 'item-content'; item.appendChild(content); const resizeHandle = document.createElement('div'); resizeHandle.className = 'resize-handle'; item.appendChild(resizeHandle); if (type === 'sticky') { item.classList.add('sticky'); title.textContent = 'Sticky Note'; const textarea = document.createElement('textarea'); textarea.placeholder = 'Write something...'; content.replaceWith(textarea); } else if (type === 'table') { item.classList.add('table-container'); title.textContent = 'Table'; setupTable(item, content); } canvas.appendChild(item); return item; }
    function setupTable(tableContainer, content) { const table = document.createElement('table'); const thead = table.createTHead(); const tbody = table.createTBody(); const headerRow = thead.insertRow(); for (let i = 0; i < 2; i++) { const th = document.createElement('th'); th.textContent = `Header ${i + 1}`; headerRow.appendChild(th); } const bodyRow = tbody.insertRow(); for (let i = 0; i < 2; i++) { const cell = bodyRow.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } content.appendChild(table); const controls = document.createElement('div'); controls.className = 'table-controls'; controls.innerHTML = `<button class="add-row">+ Row</button><button class="add-col">+ Col</button><button class="remove-row">- Row</button><button class="remove-col">- Col</button>`; tableContainer.appendChild(controls); controls.querySelector('.add-row').addEventListener('click', () => { const newRow = tbody.insertRow(); const colCount = thead.rows[0].cells.length; for (let i = 0; i < colCount; i++) { const cell = newRow.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } }); controls.querySelector('.add-col').addEventListener('click', () => { const headerCell = document.createElement('th'); headerCell.textContent = `Header`; thead.rows[0].appendChild(headerCell); for(const row of tbody.rows) { const cell = row.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } }); controls.querySelector('.remove-row').addEventListener('click', () => { if (tbody.rows.length > 1) tbody.deleteRow(-1); }); controls.querySelector('.remove-col').addEventListener('click', () => { if (thead.rows[0].cells.length > 1) { thead.rows[0].deleteCell(-1); for(const row of tbody.rows) row.deleteCell(-1); } }); }

    // --- Pan & Zoom ---
    app.addEventListener('mousedown', (e) => { if (e.target === app || e.target === canvas) { state.isPanning = true; state.lastMousePosition = { x: e.clientX, y: e.clientY }; app.style.cursor = 'grabbing'; } });
    app.addEventListener('wheel', (e) => { e.preventDefault(); const zoomSpeed = 0.1; const oldZoom = state.zoom; if (e.deltaY < 0) { state.zoom = Math.min(4, state.zoom + zoomSpeed); } else { state.zoom = Math.max(0.2, state.zoom - zoomSpeed); } const mouseX = e.clientX - state.pan.x; const mouseY = e.clientY - state.pan.y; const newPanX = e.clientX - mouseX * (state.zoom / oldZoom); const newPanY = e.clientY - mouseY * (state.zoom / oldZoom); state.pan.x = newPanX; state.pan.y = newPanY; updateCanvasTransform(); });

    // --- RESTORED: Dragging and Resizing Listeners ---
    canvas.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.item');
        if (!item) return;

        if (e.target.closest('.item-header')) {
            state.isDragging = true;
            state.draggedItem = item;
            const itemRect = item.getBoundingClientRect();
            state.lastMousePosition = { x: e.clientX - itemRect.left, y: e.clientY - itemRect.top };
            item.style.zIndex = state.nextItemId++;
        } else if (e.target.classList.contains('resize-handle')) {
            state.isResizing = true;
            state.resizedItem = item;
            state.lastMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (state.isPanning) { const dx = e.clientX - state.lastMousePosition.x; const dy = e.clientY - state.lastMousePosition.y; state.pan.x += dx; state.pan.y += dy; state.lastMousePosition = { x: e.clientX, y: e.clientY }; updateCanvasTransform(); }
        else if (state.isDragging && state.draggedItem) { e.preventDefault(); const newX = (e.clientX - state.pan.x - state.lastMousePosition.x) / state.zoom; const newY = (e.clientY - state.pan.y - state.lastMousePosition.y) / state.zoom; state.draggedItem.style.left = `${newX}px`; state.draggedItem.style.top = `${newY}px`; }
        else if (state.isResizing && state.resizedItem) { e.preventDefault(); const dx = (e.clientX - state.lastMousePosition.x) / state.zoom; const dy = (e.clientY - state.lastMousePosition.y) / state.zoom; const newWidth = state.resizedItem.offsetWidth + dx; const newHeight = state.resizedItem.offsetHeight + dy; state.resizedItem.style.width = `${newWidth}px`; state.resizedItem.style.height = `${newHeight}px`; state.lastMousePosition = { x: e.clientX, y: e.clientY }; }
    });

    window.addEventListener('mouseup', () => {
        state.isPanning = false;
        state.isDragging = false;
        state.isResizing = false;
        state.draggedItem = null;
        state.resizedItem = null;
        app.style.cursor = 'grab';
    });
    // --- END OF RESTORED LISTENERS ---

    // --- Download/Upload Logic ---
    function serializeCanvas() { const items = canvas.querySelectorAll('.item'); const data = Array.from(items).map(item => { const itemData = { id: item.id, type: item.classList.contains('sticky') ? 'sticky' : 'table', left: item.style.left, top: item.style.top, width: item.style.width, height: item.style.height, }; if (itemData.type === 'sticky') { itemData.content = item.querySelector('textarea').value; } else if (itemData.type === 'table') { const headers = Array.from(item.querySelectorAll('th')).map(th => th.textContent); const rows = Array.from(item.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent)); itemData.tableData = { headers, rows }; } return itemData; }); return JSON.stringify(data, null, 2); }
    function handleDownload() { const dataStr = serializeCanvas(); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'canvas-export.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function deserializeCanvas(jsonString) { try { const data = JSON.parse(jsonString); if (!Array.isArray(data)) throw new Error("Invalid data format."); canvas.innerHTML = ''; let maxId = 0; data.forEach(itemData => { const newItem = createItem(itemData.type, itemData.left, itemData.top, itemData.width, itemData.height); if (itemData.type === 'sticky') { newItem.querySelector('textarea').value = itemData.content; } else if (itemData.type === 'table') { const table = newItem.querySelector('table'); const thead = table.tHead; const tbody = table.tBodies[0]; thead.innerHTML = ''; tbody.innerHTML = ''; const headerRow = thead.insertRow(); itemData.tableData.headers.forEach(headerText => { const th = document.createElement('th'); th.textContent = headerText; headerRow.appendChild(th); }); itemData.tableData.rows.forEach(rowData => { const tr = tbody.insertRow(); rowData.forEach(cellText => { const td = tr.insertCell(); td.textContent = cellText; td.setAttribute('contenteditable', 'true'); }); }); } const idNum = parseInt(itemData.id.split('-')[1], 10); if (idNum > maxId) { maxId = idNum; } }); state.nextItemId = maxId + 1; resetViewBtn.click(); } catch (error) { console.error("Failed to load canvas:", error); alert("Could not load file. It may be corrupted or in the wrong format."); } }
    function handleUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const content = e.target.result; deserializeCanvas(content); }; reader.readAsText(file); event.target.value = null; }
    
    // --- Toolbar Actions ---
    addStickyBtn.addEventListener('click', () => { const center = getCanvasCoords(window.innerWidth / 2, window.innerHeight / 2); const spawnPos = findEmptySpot(center.x - DEFAULT_STICKY_WIDTH / 2, center.y - DEFAULT_STICKY_HEIGHT / 2, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT); createItem('sticky', spawnPos.x, spawnPos.y, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT); });
    addTableBtn.addEventListener('click', () => { const center = getCanvasCoords(window.innerWidth / 2, window.innerHeight / 2); const spawnPos = findEmptySpot(center.x - DEFAULT_TABLE_WIDTH / 2, center.y - DEFAULT_TABLE_HEIGHT / 2, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT); createItem('table', spawnPos.x, spawnPos.y, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT); });
    zoomInBtn.addEventListener('click', () => { state.zoom = Math.min(4, state.zoom + 0.2); updateCanvasTransform(); });
    zoomOutBtn.addEventListener('click', () => { state.zoom = Math.max(0.2, state.zoom - 0.2); updateCanvasTransform(); });
    resetViewBtn.addEventListener('click', () => { state.zoom = 1; state.pan = { x: window.innerWidth / 4, y: window.innerHeight / 4 }; updateCanvasTransform(); });
    downloadBtn.addEventListener('click', handleDownload);
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleUpload);

    // --- Initialization ---
    function initialize() {
        createItem('sticky', 100, 100, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT);
        createItem('table', 400, 150, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT);
        updateCanvasTransform();
    }
    initialize();
});