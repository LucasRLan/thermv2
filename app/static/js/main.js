document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const ditherSelect = document.getElementById('dither');
    const preview = document.getElementById('preview');
    const form = document.getElementById('image-form');
    const uploadImageButton = document.getElementById('upload-image-button');
    const useCameraButton = document.getElementById('use-camera-button');
    const cameraContainer = document.getElementById('camera-container');
    const cameraView = document.getElementById('camera-view');
    const takePictureButton = document.getElementById('take-picture-button');
    const printImageButton = document.getElementById('print-image-button');
    const textForm = document.getElementById('text-form');
    const flashMessages = document.getElementById('flash-messages');
    const messageInput = document.getElementById('message');
    const nameInput = document.getElementById('name');

    function updatePreview() {
        const file = imageInput.files[0];
        const dither = ditherSelect.value;

        if (file) {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('dither', dither);

            fetch('/process_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                preview.src = url;
                printImageButton.disabled = false; // Enable the button
            })
            .catch(error => console.error('Error:', error));
        }
    }

    uploadImageButton.addEventListener('click', () => {
        imageInput.click();
    });

    useCameraButton.addEventListener('click', () => {
        cameraContainer.style.display = 'block';
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            cameraView.srcObject = stream;
        }).catch(error => console.error('Error accessing camera:', error));
    });

    takePictureButton.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = cameraView.videoWidth;
        canvas.height = cameraView.videoHeight;
        context.drawImage(cameraView, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            const file = new File([blob], 'camera-image.png', { type: 'image/png' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageInput.files = dataTransfer.files;
            updatePreview();
        });
    });

    imageInput.addEventListener('change', updatePreview);
    ditherSelect.addEventListener('change', updatePreview);

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission
        flashMessages.innerHTML = '<p>Image is being printed...</p>';
        const formData = new FormData(form);
        fetch(form.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                flashMessages.innerHTML = '<p>Image printed successfully!</p>';
                // Clear the uploaded image and preview
                imageInput.value = '';
                preview.src = '';
                printImageButton.disabled = true; // Disable the button
            } else {
                flashMessages.innerHTML = '<p>Failed to print image.</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            flashMessages.innerHTML = '<p>Error occurred while printing image.</p>';
        });
    });

    textForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission
        flashMessages.innerHTML = '<p>Message is being printed...</p>';
        const formData = new FormData(textForm);
        fetch(textForm.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                flashMessages.innerHTML = '<p>Message printed successfully!</p>';
                // Clear the message field but keep the name
                messageInput.value = '';
            } else {
                flashMessages.innerHTML = '<p>Failed to print message.</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            flashMessages.innerHTML = '<p>Error occurred while printing message.</p>';
        });
    });
});