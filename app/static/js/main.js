document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const ditherSelect = document.getElementById('dither');
    // const edgeEnhanceCheckbox = document.getElementById('edge-enhance');
    const preview = document.getElementById('preview');
    const form = document.getElementById('image-form');

    function updatePreview() {
        const file = imageInput.files[0];
        const dither = ditherSelect.value;
        // const edgeEnhance = edgeEnhanceCheckbox.checked;

        if (file) {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('dither', dither);
            // formData.append('edge_enhance', edgeEnhance);

            fetch('/process_image', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                // const defaultEdgeEnhance = response.headers.get('Edge-Enhance') === 'true';
                // if (!edgeEnhanceCheckbox.dataset.userChanged) {
                //     edgeEnhanceCheckbox.checked = defaultEdgeEnhance;
                // }
                return response.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                preview.src = url;
            })
            .catch(error => console.error('Error:', error));
        }
    }

    imageInput.addEventListener('change', updatePreview);
    ditherSelect.addEventListener('change', updatePreview);
    // edgeEnhanceCheckbox.addEventListener('change', function() {
    //     edgeEnhanceCheckbox.dataset.userChanged = true;
    //     updatePreview();
    // });
});