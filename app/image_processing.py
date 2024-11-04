import cv2
from PIL import Image, ImageEnhance
import numpy as np

PRINTER_WIDTH = 576  # Width in pixels for your printer

# Define settings for light, dark, super bright, and super dark images
settings = {
    'bright': {
        'brightness': 1.1,
        'contrast': 1.2,
        'sharpness': 1.2,
        'dither': 'BAYER_4x4',
        'equalize': True,
        'equalize_method': 'CLAHE',
        'enhance_text': False,
        'edge_enhance': False
    },
    'dark': {
        'brightness': 1.1,
        'contrast': 1.1,
        'sharpness': 1,
        'dither': 'BAYER_4x4',
        'equalize': True,
        'equalize_method': 'CLAHE',
        'enhance_text': False,
        'edge_enhance': True
    },
    'super_bright': {
        'brightness': 0.8,
        'contrast': 1.0,
        'sharpness': 1.0,
        'dither': 'BAYER_4x4',
        'equalize': False,
        'equalize_method': 'CLAHE',
        'enhance_text': True,
        'edge_enhance': True
    },
    'super_dark': {
        'brightness': 1.8,
        'contrast': 1.8,
        'sharpness': 1.8,
        'dither': 'BAYER_4x4',
        'equalize': True,
        'equalize_method': 'CLAHE',
        'enhance_text': True,
        'edge_enhance': True
    }
}

# Define Bayer matrices
BAYER_2x2 = np.array([
    [0, 2],
    [3, 1]
]) * (255 // 4)

BAYER_4x4 = np.array([
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
]) * (255 // 16)

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
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)[1]
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilate = cv2.morphologyEx(thresh, cv2.MORPH_DILATE, kernel)
    diff = cv2.absdiff(dilate, thresh)
    edges = 255 - diff
    return edges

def process_image(image_path, dither_option, edge_enhance):
    image = Image.open(image_path).convert("RGBA")
    # Create a white background image
    white_bg = Image.new("RGBA", image.size, "WHITE")
    # Composite the image with the white background
    image = Image.alpha_composite(white_bg, image).convert("RGB")

    image = np.array(image)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    avg_brightness = analyze_image(gray_image)
    print(f"Average brightness: {avg_brightness}")

    if avg_brightness < 50:
        current_settings = settings['super_dark']
    elif avg_brightness < 118:
        current_settings = settings['dark']
    elif avg_brightness > 200:
        current_settings = settings['super_bright']
    else:
        current_settings = settings['bright']

    if current_settings['equalize']:
        if current_settings['equalize_method'] == 'CLAHE':
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            processed_image = clahe.apply(gray_image)
        elif current_settings['equalize_method'] == 'HISTOGRAM':
            processed_image = cv2.equalizeHist(gray_image)
        else:
            processed_image = gray_image
    else:
        processed_image = gray_image

    if edge_enhance or current_settings['edge_enhance']:
        edges = enhance_edges(image)
        processed_image = cv2.addWeighted(processed_image, 0.8, edges, 0.2, 0)

    processed_image = cv2.convertScaleAbs(processed_image, alpha=current_settings['brightness'])
    processed_image = cv2.convertScaleAbs(processed_image, alpha=current_settings['contrast'], beta=0)

    aspect_ratio = PRINTER_WIDTH / processed_image.shape[1]
    new_height = int(processed_image.shape[0] * aspect_ratio)
    processed_image = cv2.resize(processed_image, (PRINTER_WIDTH, new_height), interpolation=cv2.INTER_AREA)

    pil_image = Image.fromarray(processed_image)
    enhancer = ImageEnhance.Sharpness(pil_image)
    pil_image = enhancer.enhance(current_settings['sharpness'])

    if dither_option == 'BAYER_2x2':
        pil_image = apply_bayer_dithering(pil_image, BAYER_2x2)
    elif dither_option == 'BAYER_4x4':
        pil_image = apply_bayer_dithering(pil_image, BAYER_4x4)
    elif dither_option == 'BAYER_8x8':
        pil_image = apply_bayer_dithering(pil_image, BAYER_8x8)
    elif dither_option == 'THRESHOLD':
        pil_image = pil_image.point(lambda p: 255 if p > 128 else 0, mode='1')
    else:
        pil_image = pil_image.convert('1', dither=Image.FLOYDSTEINBERG)

    return pil_image, current_settings['edge_enhance']