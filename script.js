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

    function updateCanvasTransform() {
        canvas.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
    }

    // The panToElement function has been REMOVED.
    
    // --- Pan & Zoom Logic (Simplified) ---
    // The logic to toggle the transition has been removed as it's no longer needed.
    app.addEventListener('mousedown', (e) => { if (e.target === app || e.target === canvas) { state.isPanning = true; state.lastMousePosition = { x: e.clientX, y: e.clientY }; app.style.cursor = 'grabbing'; } });
    window.addEventListener('mousemove', (e) => {
        if (state.isPanning) { const dx = e.clientX - state.lastMousePosition.x; const dy = e.clientY - state.lastMousePosition.y; state.pan.x += dx; state.pan.y += dy; state.lastMousePosition = { x: e.clientX, y: e.clientY }; updateCanvasTransform(); }
        else if (state.isDragging && state.draggedItem) { e.preventDefault(); const newX = (e.clientX - state.pan.x - state.lastMousePosition.x) / state.zoom; const newY = (e.clientY - state.pan.y - state.lastMousePosition.y) / state.zoom; state.draggedItem.style.left = `${newX}px`; state.draggedItem.style.top = `${newY}px`; }
        else if (state.isResizing && state.resizedItem) { e.preventDefault(); const dx = (e.clientX - state.lastMousePosition.x) / state.zoom; const dy = (e.clientY - state.lastMousePosition.y) / state.zoom; const newWidth = state.resizedItem.offsetWidth + dx; const newHeight = state.resizedItem.offsetHeight + dy; state.resizedItem.style.width = `${newWidth}px`; state.resizedItem.style.height = `${newHeight}px`; state.lastMousePosition = { x: e.clientX, y: e.clientY }; }
    });
    window.addEventListener('mouseup', () => { state.isPanning = false; state.isDragging = false; state.isResizing = false; state.draggedItem = null; state.resizedItem = null; app.style.cursor = 'grab'; });
    app.addEventListener('wheel', (e) => { e.preventDefault(); const zoomSpeed = 0.1; const oldZoom = state.zoom; if (e.deltaY < 0) { state.zoom = Math.min(4, state.zoom + zoomSpeed); } else { state.zoom = Math.max(0.2, state.zoom - zoomSpeed); } const mouseX = e.clientX - state.pan.x; const mouseY = e.clientY - state.pan.y; const newPanX = e.clientX - mouseX * (state.zoom / oldZoom); const newPanY = e.clientY - mouseY * (state.zoom / oldZoom); state.pan.x = newPanX; state.pan.y = newPanY; updateCanvasTransform(); });
    function getCanvasCoords(clientX, clientY) { return { x: (clientX - state.pan.x) / state.zoom, y: (clientY - state.pan.y) / state.zoom }; }

    // --- Collision and Placement Logic ---
    function doRectsOverlap(rect1, rect2) { return (rect1.x < rect2.x + rect2.width + PLACEMENT_PADDING && rect1.x + rect1.width + PLACEMENT_PADDING > rect2.x && rect1.y < rect2.y + rect2.height + PLACEMENT_PADDING && rect1.y + rect1.height + PLACEMENT_PADDING > rect2.y); }
    
    // --- NEW: Robust Spiral Placement Algorithm ---
    function findEmptySpot(startX, startY, width, height) {
        const existingItems = Array.from(canvas.querySelectorAll('.item'));
        const existingRects = existingItems.map(item => ({ x: item.offsetLeft, y: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight }));

        let candidatePos = { x: startX, y: startY };
        const maxAttempts = 1000; // Safety break
        const stepSize = 50; // How far to move in each spiral step.

        // Spiral state
        let leg = 0; // 0: right, 1: down, 2: left, 3: up
        let stepsInLeg = 1;
        let stepCount = 0;

        for (let i = 0; i < maxAttempts; i++) {
            const candidateRect = { x: candidatePos.x, y: candidatePos.y, width, height };

            // Check if this position is clear
            const isOverlapping = existingRects.some(rect => doRectsOverlap(candidateRect, rect));
            if (!isOverlapping) {
                return candidatePos; // Found a spot!
            }
            
            // If not clear, move to the next point in the spiral
            if (i === 0) { // On the first attempt, we need to take the first step
                stepCount = 0;
            }

            switch (leg) {
                case 0: candidatePos.x += stepSize; break; // Right
                case 1: candidatePos.y += stepSize; break; // Down
                case 2: candidatePos.x -= stepSize; break; // Left
                case 3: candidatePos.y -= stepSize; break; // Up
            }

            stepCount++;
            if (stepCount >= stepsInLeg) {
                leg = (leg + 1) % 4; // Turn direction
                stepCount = 0;
                // After completing a pair of legs (right-down or left-up), increase the length
                if (leg === 0 || leg === 2) {
                    stepsInLeg++;
                }
            }
        }

        console.warn("Could not find an empty spot via spiral search. Placing at original position.");
        return { x: startX, y: startY };
    }

    // --- ITEM CREATION & INTERACTION (Unchanged) ---
    function createItem(type, x, y, width, height) { const item = document.createElement('div'); item.id = `item-${state.nextItemId++}`; item.className = 'item'; item.style.left = `${x}px`; item.style.top = `${y}px`; item.style.width = `${width}px`; item.style.height = `${height}px`; const header = document.createElement('div'); header.className = 'item-header'; const title = document.createElement('span'); const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.innerHTML = '&times;'; deleteBtn.addEventListener('click', () => item.remove()); header.appendChild(title); header.appendChild(deleteBtn); item.appendChild(header); const content = document.createElement('div'); content.className = 'item-content'; item.appendChild(content); const resizeHandle = document.createElement('div'); resizeHandle.className = 'resize-handle'; item.appendChild(resizeHandle); if (type === 'sticky') { item.classList.add('sticky'); title.textContent = 'Sticky Note'; const textarea = document.createElement('textarea'); textarea.placeholder = 'Write something...'; content.replaceWith(textarea); } else if (type === 'table') { item.classList.add('table-container'); title.textContent = 'Table'; setupTable(item, content); } canvas.appendChild(item); return item; }
    function setupTable(tableContainer, content) { const table = document.createElement('table'); const thead = table.createTHead(); const tbody = table.createTBody(); const headerRow = thead.insertRow(); for (let i = 0; i < 2; i++) { const th = document.createElement('th'); th.textContent = `Header ${i + 1}`; headerRow.appendChild(th); } const bodyRow = tbody.insertRow(); for (let i = 0; i < 2; i++) { const cell = bodyRow.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } content.appendChild(table); const controls = document.createElement('div'); controls.className = 'table-controls'; controls.innerHTML = `<button class="add-row">+ Row</button><button class="add-col">+ Col</button><button class="remove-row">- Row</button><button class="remove-col">- Col</button>`; tableContainer.appendChild(controls); controls.querySelector('.add-row').addEventListener('click', () => { const newRow = tbody.insertRow(); const colCount = thead.rows[0].cells.length; for (let i = 0; i < colCount; i++) { const cell = newRow.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } }); controls.querySelector('.add-col').addEventListener('click', () => { const headerCell = document.createElement('th'); headerCell.textContent = `Header`; thead.rows[0].appendChild(headerCell); for(const row of tbody.rows) { const cell = row.insertCell(); cell.textContent = 'Data'; cell.setAttribute('contenteditable', 'true'); } }); controls.querySelector('.remove-row').addEventListener('click', () => { if (tbody.rows.length > 1) tbody.deleteRow(-1); }); controls.querySelector('.remove-col').addEventListener('click', () => { if (thead.rows[0].cells.length > 1) { thead.rows[0].deleteCell(-1); for(const row of tbody.rows) row.deleteCell(-1); } }); }
    canvas.addEventListener('mousedown', (e) => { const item = e.target.closest('.item'); if (!item) return; if (e.target.closest('.item-header')) { state.isDragging = true; state.draggedItem = item; const itemRect = item.getBoundingClientRect(); state.lastMousePosition = { x: e.clientX - itemRect.left, y: e.clientY - itemRect.top }; item.style.zIndex = state.nextItemId++; } else if (e.target.classList.contains('resize-handle')) { state.isResizing = true; state.resizedItem = item; state.lastMousePosition = { x: e.clientX, y: e.clientY }; } });
    
    // --- TOOLBAR ACTIONS (MODIFIED) ---
    // No longer pan to the element. Just create it at the found spot.
    addStickyBtn.addEventListener('click', () => {
        const center = getCanvasCoords(window.innerWidth / 2, window.innerHeight / 2);
        const spawnPos = findEmptySpot(center.x - DEFAULT_STICKY_WIDTH / 2, center.y - DEFAULT_STICKY_HEIGHT / 2, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT);
        createItem('sticky', spawnPos.x, spawnPos.y, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT);
    });
    addTableBtn.addEventListener('click', () => {
        const center = getCanvasCoords(window.innerWidth / 2, window.innerHeight / 2);
        const spawnPos = findEmptySpot(center.x - DEFAULT_TABLE_WIDTH / 2, center.y - DEFAULT_TABLE_HEIGHT / 2, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT);
        createItem('table', spawnPos.x, spawnPos.y, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT);
    });
    zoomInBtn.addEventListener('click', () => { state.zoom = Math.min(4, state.zoom + 0.2); updateCanvasTransform(); });
    zoomOutBtn.addEventListener('click', () => { state.zoom = Math.max(0.2, state.zoom - 0.2); updateCanvasTransform(); });
    resetViewBtn.addEventListener('click', () => { state.zoom = 1; state.pan = { x: window.innerWidth / 4, y: window.innerHeight / 4 }; updateCanvasTransform(); });
    
    // --- INITIALIZATION ---
    function initialize() {
        createItem('sticky', 100, 100, DEFAULT_STICKY_WIDTH, DEFAULT_STICKY_HEIGHT);
        createItem('table', 400, 150, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT);
        updateCanvasTransform();
    }
    initialize();
});