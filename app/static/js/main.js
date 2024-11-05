document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const printImageButton = document.getElementById('print-image-button');
    const preview = document.getElementById('preview');

    // Enable the print image button when an image is selected
    imageInput.addEventListener('change', function() {
        if (imageInput.files.length > 0) {
            printImageButton.disabled = false;
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            printImageButton.disabled = true;
            preview.src = '';
        }
    });

    // Handle the use camera button (if applicable)
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
        preview.src = canvas.toDataURL('image/png');
        imageInput.files = canvas.toBlob(function(blob) {
            const file = new File([blob], "camera-image.png", { type: "image/png" });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageInput.files = dataTransfer.files;
        });
        printImageButton.disabled = false;
    });
});