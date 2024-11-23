from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, send_file
import requests
from io import BytesIO
from PIL import Image
import time
import base64
import logging 
bp = Blueprint('main', __name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Global variables to store frame data and metadata
last_update_time = None
current_frame = None
estimated_runtime = None
frame_data = None

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/drawing')
def drawing_page():
    return render_template('drawing.html')

@bp.route('/print_text', methods=['POST'])
def print_text_route():
    name = request.form.get('name')
    message = request.form.get('message')
    if not name or not message:
        flash('Name and message are required.')
        return redirect(url_for('main.index'))
    print_text(name, message)
    return redirect(url_for('main.index'))

@bp.route('/print_image', methods=['POST'])
def print_image_route():
    if 'image' not in request.files or request.files['image'].filename == '':
        flash('No image uploaded.')
        return redirect(url_for('main.index'))
    file = request.files['image']
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
    if 'image' not in request.files or request.files['image'].filename == '':
        flash('No image uploaded.')
        return redirect(url_for('main.index'))
    file = request.files['image']
    image_path = os.path.join('records/images', file.filename)
    file.save(image_path)
    dither = request.form.get('dither', 'FLOYDSTEINBERG')
    processed_image, _ = process_image(image_path, dither, False)
    
    img_io = BytesIO()
    processed_image.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

@bp.route('/live_display')
def live_display():
    return render_template('live_frame.html')

@bp.route('/notify_new_frame', methods=['POST'])
def notify_new_frame():
    global last_update_time, current_frame, total_frames, estimated_runtime, frame_data
    try:
        data = request.get_json()
        logging.debug(f"Received data: {data}")
        
        last_update_time = data.get('last_update_time')
        current_frame = data.get('current_frame')
        total_frames = data.get('total_frames')
        estimated_runtime = data.get('estimated_runtime')
        frame_data = data.get('frame_data')

        # Log the values of the global variables
        logging.debug(f"Set last_update_time: {last_update_time}")
        logging.debug(f"Set current_frame: {current_frame}")
        logging.debug(f"Set total_frames: {total_frames}")
        logging.debug(f"Set estimated_runtime: {estimated_runtime}")
        if frame_data:
            logging.debug(f"Set frame_data: {frame_data[:30]}...")  # Log only the first 30 characters of frame_data
        else:
            logging.debug("Set frame_data: None")

        response = {
            "message": "Frame data received successfully.",
            "last_update_time": last_update_time,
            "current_frame": current_frame,
            "total_frames": total_frames,
            "estimated_runtime": estimated_runtime
        }
        return jsonify(response), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route('/get_current_frame', methods=['GET'])
def get_current_frame():
    try:
        # Log the values of the global variables before returning them
        logging.debug(f"Returning last_update_time: {last_update_time}")
        logging.debug(f"Returning current_frame: {current_frame}")
        logging.debug(f"Returning total_frames: {total_frames}")
        logging.debug(f"Returning estimated_runtime: {estimated_runtime}")
        if frame_data:
            logging.debug(f"Returning frame_data: {frame_data[:30]}...")  # Log only the first 30 characters of frame_data
        else:
            logging.debug("Returning frame_data: None")
        
        # Calculate the percentage of the movie completed
        percentage_completed = (current_frame / total_frames) * 100 if total_frames else 0

        response = {
            "last_update_time": last_update_time,
            "current_frame": current_frame,
            "total_frames": total_frames,
            "estimated_runtime": estimated_runtime,
            "frame_data": frame_data,
            "percentage_completed": percentage_completed
        }
        return jsonify(response), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500