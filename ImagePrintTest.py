import cv2
from PIL import Image, ImageEnhance
import numpy as np
import os
import time
from escpos.printer import Network

# Printer configuration
PRINTER_IP = "192.168.1.128"
PRINTER_PORT = 9100
PRINTER_WIDTH = 576  # Width in pixels for your printer
FRAGMENT_HEIGHT = 256  # Height of each image fragment
    
# Ensure the processed_images folder exists
PROCESSED_IMAGES_FOLDER = os.path.join(os.getcwd(), 'processed_images')
os.makedirs(PROCESSED_IMAGES_FOLDER, exist_ok=True)

# Get the absolute path to the 'tests' folder
current_folder = os.path.dirname(__file__)
image_folder = os.path.join(current_folder, 'tests')

def apply_bayer_dithering(image, bayer_matrix):
    width, height = image.size
    bayer_pattern = np.tile(bayer_matrix, (height // bayer_matrix.shape[0] + 1, width // bayer_matrix.shape[1] + 1))
    bayer_pattern = bayer_pattern[:height, :width]

    image_array = np.array(image)
    dithered_array = (image_array > bayer_pattern).astype(np.uint8) * 255
    return Image.fromarray(dithered_array, mode='L')

def analyze_image(image):
    avg_brightness = np.mean(image)
    return avg_brightness

def enhance_edges(image):
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply threshold
    thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)[1]

    # Morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilate = cv2.morphologyEx(thresh, cv2.MORPH_DILATE, kernel)

    # Get absolute difference between dilate and thresh
    diff = cv2.absdiff(dilate, thresh)

    # Invert the difference to get edges
    edges = 255 - diff

    return edges

def process_image(image_path, settings):
    # Load the image
    image = cv2.imread(image_path)
    
    # Verify that the image was loaded
    if image is None:
        print(f"Error: Failed to load the image '{image_path}'. Check the file path or file format.")
        return None

    # Analyze the image
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    avg_brightness, dynamic_range = analyze_image(gray_image)
    print(f"Average brightness: {avg_brightness}")
    print(f"Dynamic range: {dynamic_range}")

    # Classify the image and apply corresponding settings
    if avg_brightness < 50:
        print("Classified as super dark")
        settings = settings['super_dark']
    elif avg_brightness < 118:
        print("Classified as dark")
        settings = settings['dark']
    elif avg_brightness > 200:
        print("Classified as super bright")
        settings = settings['super_bright']
    else:
        print("Classified as bright")
        settings = settings['bright']

    # Apply equalization if specified
    if settings['equalize']:
        if settings['equalize_method'] == 'CLAHE':
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            processed_image = clahe.apply(gray_image)
        elif settings['equalize_method'] == 'HISTOGRAM':
            processed_image = cv2.equalizeHist(gray_image)
        else:
            processed_image = gray_image
    else:
        processed_image = gray_image

    # Enhance edges if specified
    if settings['edge_enhance']:
        edges = enhance_edges(image)
        processed_image = cv2.addWeighted(processed_image, 0.8, edges, 0.2, 0)

    # Adjust brightness
    processed_image = cv2.convertScaleAbs(processed_image, alpha=settings['brightness'])

    # Adjust contrast
    processed_image = cv2.convertScaleAbs(processed_image, alpha=settings['contrast'], beta=0)

    # Resize image to match printer width while keeping aspect ratio
    aspect_ratio = PRINTER_WIDTH / processed_image.shape[1]
    new_height = int(processed_image.shape[0] * aspect_ratio)
    processed_image = cv2.resize(processed_image, (PRINTER_WIDTH, new_height), interpolation=cv2.INTER_AREA)

    # Convert processed OpenCV image to Pillow image
    pil_image = Image.fromarray(processed_image)

    # Adjust sharpness
    enhancer = ImageEnhance.Sharpness(pil_image)
    pil_image = enhancer.enhance(settings['sharpness'])  # Increase sharpness as needed

    # Apply dithering
    if settings['dither'] == 'BAYER_2x2':
        BAYER_2x2 = np.array([
            [0, 2],
            [3, 1]
        ]) * (255 // 4)
        pil_image = apply_bayer_dithering(pil_image, BAYER_2x2)
    elif settings['dither'] == 'BAYER_4x4':
        BAYER_4x4 = np.array([
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ]) * (255 // 16)
        pil_image = apply_bayer_dithering(pil_image, BAYER_4x4)
    elif settings['dither'] == 'BAYER_8x8':
        BAYER_8x8 = np.array([
            [0, 48, 12, 60, 3, 51, 15, 63],
            [32, 16, 44, 28, 35, 19, 47, 31],
            [8, 56, 4, 52, 11, 59, 7, 55],
            [40, 24, 36, 20, 43, 27, 39, 23],
            [2, 50, 14, 62, 1, 49, 13, 61],
            [34, 18, 46, 30, 33, 17, 45, 29],
            [10, 58, 6, 54, 9, 57, 5, 53],
            [42, 26, 38, 22, 41, 25, 37, 21]
        ]) * (255 // 64)
        pil_image = apply_bayer_dithering(pil_image, BAYER_8x8)
    elif settings['dither'] == 'THRESHOLD':
        pil_image = pil_image.point(lambda p: 255 if p > 128 else 0, mode='1')
    else:
        pil_image = pil_image.convert('1', dither=Image.FLOYDSTEINBERG)  # Default to Floyd-Steinberg

    return pil_image

def fragment_image(image, fragment_height):
    width, height = image.size
    fragments = []
    for top in range(0, height, fragment_height):
        bottom = min(top + fragment_height, height)
        fragment = image.crop((0, top, width, bottom))
        fragments.append(fragment)
    return fragments

def reset_printer(printer):
    # Reset the printer to clear any previous state
    printer._raw(b'\x1b\x40')  # ESC @ (Initialize printer)
    printer._raw(b'\x1b\x63\x30\x02')  # ESC c 0 2 (Reset printer mode)

def print_image(pil_image):
    # Check if the processed image is valid
    if pil_image is None:
        print("Error: No image to print.")
        return

    # Fragment the image
    fragments = fragment_image(pil_image, FRAGMENT_HEIGHT)

    # Connect to the printer
    printer = Network(PRINTER_IP, PRINTER_PORT)
    
    # Set the media width in the printer profile
    printer.profile.profile_data['media']['width']['pixels'] = PRINTER_WIDTH
    
    try:
        # Reset the printer before printing
        reset_printer(printer)
        
        # Send each fragment to the printer with a delay
        for fragment in fragments:
            printer.image(fragment)
            time.sleep(0.1)  # Add a small delay between fragments
        
        # Perform a partial cut instead of a full cut
        printer.cut(mode='PART', feed=True)
    finally:
        # Close the connection
        printer.close()

# Define settings for light, dark, super bright, and super dark images
settings = {
    'bright': {
        'brightness': 1.1,
        'contrast': 1.2,
        'sharpness': 1.2,
        'dither': 'BAYER_4x4',  # Valid options: 'BAYER_2x2', 'BAYER_4x4', 'BAYER_8x8', 'THRESHOLD', 'FLOYDSTEINBERG'
        'equalize': True,
        'equalize_method': 'CLAHE',  # Valid options: 'CLAHE', 'HISTOGRAM'
        'enhance_text': False,
        'edge_enhance': False
    },
    'dark': {
        'brightness': 1.1,
        'contrast': 1.1,
        'sharpness': 1,
        'dither': 'BAYER_4x4',  # Valid options: 'BAYER_2x2', 'BAYER_4x4', 'BAYER_8x8', 'THRESHOLD', 'FLOYDSTEINBERG'
        'equalize': True,
        'equalize_method': 'CLAHE',  # Valid options: 'CLAHE', 'HISTOGRAM'
        'enhance_text': False,
        'edge_enhance': True
    },
    'super_bright': {
        'brightness': 0.8,
        'contrast': 1.0,
        'sharpness': 1.0,
        'dither': 'BAYER_4x4',  # Valid options: 'BAYER_2x2', 'BAYER_4x4', 'BAYER_8x8', 'THRESHOLD', 'FLOYDSTEINBERG'
        'equalize': False,
        'equalize_method': 'CLAHE',  # Valid options: 'CLAHE', 'HISTOGRAM'
        'enhance_text': True,
        'edge_enhance': True
    },
    'super_dark': {
        'brightness': 1.8,
        'contrast': 1.8,
        'sharpness': 1.8,
        'dither': 'BAYER_4x4',  # Valid options: 'BAYER_2x2', 'BAYER_4x4', 'BAYER_8x8', 'THRESHOLD', 'FLOYDSTEINBERG'
        'equalize': True,
        'equalize_method': 'CLAHE',  # Valid options: 'CLAHE', 'HISTOGRAM'
        'enhance_text': True,
        'edge_enhance': True
    }
}

# Process and print each image in the 'tests' folder
for filename in os.listdir(image_folder):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
        image_path = os.path.join(image_folder, filename)
        print(f"Processing: {image_path}")
        
        # Adjust brightness, contrast, sharpness, dithering, and equalization as needed
        processed_image = process_image(image_path, settings)
        
        # Save the processed image for verification
        processed_image_path = os.path.join(PROCESSED_IMAGES_FOLDER, f"processed_{filename}")
        print(f"Saving processed image to: {processed_image_path}")
        processed_image.save(processed_image_path)
        
        # Print the processed image
        print_image(processed_image)