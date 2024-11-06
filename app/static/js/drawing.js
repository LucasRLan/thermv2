document.addEventListener('DOMContentLoaded', function() {
    const drawingCanvas = document.getElementById('drawing-canvas');
    const clearDrawingButton = document.getElementById('clear-drawing');
    const saveDrawingButton = document.getElementById('save-drawing');
    const printDrawingButton = document.getElementById('print-drawing');
    const toolPencilButton = document.getElementById('tool-pencil');
    const toolTextButton = document.getElementById('tool-text');
    const toolEraserButton = document.getElementById('tool-eraser');
    const undoButton = document.getElementById('undo');
    const flashMessages = document.getElementById('flash-messages');
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

    function getTouchPos(touchEvent) {
        const rect = drawingCanvas.getBoundingClientRect();
        return {
            x: Math.floor((touchEvent.touches[0].clientX - rect.left) / scaleFactor),
            y: Math.floor((touchEvent.touches[0].clientY - rect.top) / scaleFactor)
        };
    }

    function startDrawing(x, y) {
        drawing = true;
        saveState();
        lastX = x;
        lastY = y;
        if (tool === 'pencil' || tool === 'eraser') {
            draw({ x, y }); // Start drawing immediately
        } else if (tool === 'text') {
            addTextInput(x, y);
        }
    }

    function stopDrawing() {
        drawing = false;
        ctx.beginPath(); // Reset the path to avoid connecting lines
    }

    function draw({ x, y }) {
        if (!drawing) return;
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

    drawingCanvas.addEventListener('mousedown', (event) => {
        const rect = drawingCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / scaleFactor);
        const y = Math.floor((event.clientY - rect.top) / scaleFactor);
        startDrawing(x, y);
    });

    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);
    drawingCanvas.addEventListener('mousemove', (event) => {
        const rect = drawingCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / scaleFactor);
        const y = Math.floor((event.clientY - rect.top) / scaleFactor);
        draw({ x, y });
    });

    drawingCanvas.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent scrolling
        const touchPos = getTouchPos(event);
        startDrawing(touchPos.x, touchPos.y);
    });

    drawingCanvas.addEventListener('touchend', (event) => {
        event.preventDefault(); // Prevent scrolling
        stopDrawing();
    });

    drawingCanvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Prevent scrolling
        const touchPos = getTouchPos(event);
        draw(touchPos);
    });

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

    function addTextInput(x, y) {
        if (textInput) {
            textInput.remove();
        }
        const rect = drawingCanvas.getBoundingClientRect();
        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.style.position = 'absolute';
        textInput.style.left = `${rect.left + x * scaleFactor}px`;
        textInput.style.top = `${rect.top + y * scaleFactor}px`;
        textInput.style.fontSize = '16px';
        textInput.style.zIndex = 1000;
        document.body.appendChild(textInput);
        textInput.focus(); // Set focus to the text input box
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
        flashMessages.innerHTML = '<p>Drawing is being printed...</p>';
        const dataURL = drawingCanvas.toDataURL('image/png');
        fetch('/print_drawing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: dataURL })
        }).then(response => {
            if (response.ok) {
                flashMessages.innerHTML = '<p>Drawing printed successfully!</p>';
            } else {
                flashMessages.innerHTML = '<p>Failed to print drawing.</p>';
            }
        }).catch(error => {
            console.error('Error:', error);
            flashMessages.innerHTML = '<p>Error occurred while printing drawing.</p>';
        });
    });
});