from flask import Blueprint, render_template, request, redirect, url_for, flash, send_file
from .printing import print_text, print_image, save_processed_image
from .image_processing import process_image
import os
from io import BytesIO

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/print_text', methods=['POST'])
def print_text_route():
    name = request.form.get('name')
    message = request.form.get('message')
    if not name or not message:
        flash('Both fields are required!')
        return redirect(url_for('main.index'))
    print_text(name, message)
    return redirect(url_for('main.index'))

@bp.route('/print_image', methods=['POST'])
def print_image_route():
    if 'image' not in request.files:
        flash('No file part')
        return redirect(url_for('main.index'))
    file = request.files['image']
    if file.filename == '':
        flash('No selected file')
        return redirect(url_for('main.index'))
    if file:
        image_name = request.form.get('image_name', 'anon')
        image_path = os.path.join('records/images', file.filename)
        file.save(image_path)
        dither = request.form.get('dither', 'FLOYDSTEINBERG')
        processed_image, _ = process_image(image_path, dither, False)
        save_processed_image(processed_image, image_name, file.filename)
        print_image(processed_image)
        return redirect(url_for('main.index'))

@bp.route('/process_image', methods=['POST'])
def process_image_route():
    if 'image' not in request.files:
        return 'No file part', 400
    file = request.files['image']
    if file.filename == '':
        return 'No selected file', 400
    if file:
        image_path = os.path.join('records/images', file.filename)
        file.save(image_path)
        dither = request.form.get('dither', 'FLOYDSTEINBERG')
        processed_image, _ = process_image(image_path, dither, False)
        
        img_io = BytesIO()
        processed_image.save(img_io, 'PNG')
        img_io.seek(0)
        return send_file(img_io, mimetype='image/png')