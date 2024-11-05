document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const printImageButton = document.getElementById('print-image-button');
    const preview = document.getElementById('preview');
    const ditherSelect = document.getElementById('dither');

    imageInput.addEventListener('change', function() {
        if (imageInput.files.length > 0) {
            printImageButton.disabled = false;
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);
            formData.append('dither', ditherSelect.value);
            fetch('/process_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                console.log('Processed image URL:', url); // Debugging information
                preview.src = url;
            })
            .catch(error => {
                console.error('Error processing image:', error);
            });
        } else {
            printImageButton.disabled = true;
            preview.src = '';
        }
    });

    const useCameraButton = document.getElementById('use-camera-button');
    const cameraContainer = document.getElementById('camera-container');
    const takePictureButton = document.getElementById('take-picture-button');
    const video = document.createElement('video');

    useCameraButton.addEventListener('click', function() {
        cameraContainer.innerHTML = ''; // Clear any previous content
        cameraContainer.appendChild(video);

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                video.srcObject = stream;
                video.play();
                takePictureButton.disabled = false;
            })
            .catch(function(err) {
                console.error("Error accessing camera: " + err);
            });
    });

    takePictureButton.addEventListener('click', function() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
            const file = new File([blob], "camera-image.png", { type: "image/png" });
            const formData = new FormData();
            formData.append('image', file);
            formData.append('dither', ditherSelect.value);
            fetch('/process_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                console.log('Processed image URL:', url); // Debugging information
                preview.src = url;
            })
            .catch(error => {
                console.error('Error processing image:', error);
            });
        });
        printImageButton.disabled = false;
    });
});