document.addEventListener('DOMContentLoaded', function() {
    const drawingCanvas = document.getElementById('drawing-canvas');
    const clearDrawingButton = document.getElementById('clear-drawing');
    const saveDrawingButton = document.getElementById('save-drawing');
    const printDrawingButton = document.getElementById('print-drawing');
    const toolPencilButton = document.getElementById('tool-pencil');
    const toolLineButton = document.getElementById('tool-line');
    const toolRectangleButton = document.getElementById('tool-rectangle');
    const toolCircleButton = document.getElementById('tool-circle');
    const toolTextButton = document.getElementById('tool-text');
    const toolEraserButton = document.getElementById('tool-eraser');
    const undoButton = document.getElementById('undo');
    let drawing = false;
    let brushSize = 3; // Default brush size
    let lastX = 0;
    let lastY = 0;
    let tool = 'pencil'; // Default tool
    let textInput = null;
    let history = []; // To store the history of drawings

    // Set the canvas resolution and scaling factor
    const canvasWidth = 576; // Set to printer width
    const canvasHeight = 576;
    const scaleFactor = 1; // Increase this value to make pixels bigger

    drawingCanvas.width = canvasWidth;
    drawingCanvas.height = canvasHeight;
    drawingCanvas.style.width = `${canvasWidth * scaleFactor}px`;
    drawingCanvas.style.height = `${canvasHeight * scaleFactor}px`;

    const ctx = drawingCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Disable image smoothing for pixelated effect

    function saveState() {
        history.push(drawingCanvas.toDataURL());
        if (history.length > 10) {
            history.shift(); // Limit history to the last 10 states
        }
    }

    drawingCanvas.addEventListener('mousedown', (event) => {
        drawing = true;
        saveState();
        const rect = drawingCanvas.getBoundingClientRect();
        lastX = Math.floor((event.clientX - rect.left) / scaleFactor);
        lastY = Math.floor((event.clientY - rect.top) / scaleFactor);
        if (tool === 'pencil' || tool === 'eraser') {
            draw(event); // Start drawing immediately
        } else if (tool === 'text') {
            addTextInput(event.clientX, event.clientY);
        }
    });

    drawingCanvas.addEventListener('mouseup', (event) => {
        drawing = false;
        if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
            const rect = drawingCanvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left) / scaleFactor);
            const y = Math.floor((event.clientY - rect.top) / scaleFactor);
            if (tool === 'line') {
                drawLine(ctx, lastX, lastY, x, y);
            } else if (tool === 'rectangle') {
                drawRectangle(ctx, lastX, lastY, x, y);
            } else if (tool === 'circle') {
                drawCircle(ctx, lastX, lastY, x, y);
            }
        }
        ctx.beginPath(); // Reset the path to avoid connecting lines
    });

    drawingCanvas.addEventListener('mousemove', draw);

    function draw(event) {
        if (!drawing) return;
        const rect = drawingCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / scaleFactor);
        const y = Math.floor((event.clientY - rect.top) / scaleFactor);
        if (tool === 'pencil') {
            interpolateLine(ctx, lastX, lastY, x, y, brushSize);
            lastX = x;
            lastY = y;
        } else if (tool === 'eraser') {
            interpolateLine(ctx, lastX, lastY, x, y, brushSize, true);
            lastX = x;
            lastY = y;
        }
    }

    function interpolateLine(ctx, x0, y0, x1, y1, radius, erase = false) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (erase) {
                ctx.clearRect(x0 - radius, y0 - radius, radius * 2, radius * 2);
            } else {
                drawPixelatedCircle(ctx, x0, y0, radius);
            }
            if (x0 === x1 && y0 === y1) break;
            const e2 = err * 2;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    function drawPixelatedCircle(ctx, x, y, radius) {
        const pixelSize = 2; // Size of each pixel
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                if (i * i + j * j <= radius * radius) {
                    ctx.fillRect(x + i * pixelSize, y + j * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    function drawLine(ctx, x0, y0, x1, y1) {
        // Draw a line using the chunky brush without interpolation
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    function drawRectangle(ctx, x0, y0, x1, y1) {
        const width = Math.abs(x1 - x0);
        const height = Math.abs(y1 - y0);
        const startX = Math.min(x0, x1);
        const startY = Math.min(y0, y1);

        for (let i = 0; i <= width; i++) {
            drawPixelatedCircle(ctx, startX + i, startY, brushSize);
            drawPixelatedCircle(ctx, startX + i, startY + height, brushSize);
        }
        for (let j = 0; j <= height; j++) {
            drawPixelatedCircle(ctx, startX, startY + j, brushSize);
            drawPixelatedCircle(ctx, startX + width, startY + j, brushSize);
        }
    }

    function drawCircle(ctx, x0, y0, x1, y1) {
        const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const distance = Math.sqrt(i * i + j * j);
                if (distance >= radius - 1 && distance <= radius + 1) {
                    drawPixelatedCircle(ctx, x0 + i, y0 + j, brushSize);
                }
            }
        }
    }

    function addTextInput(clientX, clientY) {
        if (textInput) {
            textInput.remove();
        }
        const rect = drawingCanvas.getBoundingClientRect();
        const x = Math.floor((clientX - rect.left) / scaleFactor);
        const y = Math.floor((clientY - rect.top) / scaleFactor);
        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.style.position = 'absolute';
        textInput.style.left = `${clientX}px`;
        textInput.style.top = `${clientY}px`;
        textInput.style.fontSize = '16px';
        textInput.style.zIndex = 1000;
        document.body.appendChild(textInput);
        textInput.focus();
        textInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                drawText(ctx, x, y, textInput.value);
                textInput.remove();
                textInput = null;
            }
        });
    }

    function drawText(ctx, x, y, text) {
        ctx.font = '54px "times'; // Use a pixelated font
        ctx.fillText(text, x, y);
    }

    function setActiveTool(toolButton) {
        document.querySelectorAll('.section button').forEach(button => {
            button.classList.remove('active-tool');
        });
        toolButton.classList.add('active-tool');
    }

    toolPencilButton.addEventListener('click', () => {
        tool = 'pencil';
        setActiveTool(toolPencilButton);
    });

    toolLineButton.addEventListener('click', () => {
        tool = 'line';
        setActiveTool(toolLineButton);
    });

    toolRectangleButton.addEventListener('click', () => {
        tool = 'rectangle';
        setActiveTool(toolRectangleButton);
    });

    toolCircleButton.addEventListener('click', () => {
        tool = 'circle';
        setActiveTool(toolCircleButton);
    });

    toolTextButton.addEventListener('click', () => {
        tool = 'text';
        setActiveTool(toolTextButton);
    });

    toolEraserButton.addEventListener('click', () => {
        tool = 'eraser';
        setActiveTool(toolEraserButton);
    });

    undoButton.addEventListener('click', () => {
        if (history.length > 0) {
            const img = new Image();
            img.src = history.pop();
            img.onload = () => {
                ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    clearDrawingButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        history = []; // Clear history
    });

    saveDrawingButton.addEventListener('click', () => {
        const dataURL = drawingCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'drawing.png';
        link.click();
    });

    printDrawingButton.addEventListener('click', () => {
        const dataURL = drawingCanvas.toDataURL('image/png');
        fetch('/print_drawing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: dataURL })
        }).then(response => response.json()).then(data => {
            if (data.success) {
                alert('Drawing printed successfully!');
            } else {
                alert('Failed to print drawing.');
            }
        });
    });

    // Example function to change brush size (can be connected to a UI element)
    function setBrushSize(size) {
        brushSize = size;
    }
});