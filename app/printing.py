from escpos.printer import Network
import time
import os

PRINTER_IP = "192.168.1.128"
PRINTER_PORT = 9100
PRINTER_WIDTH = 576
FRAGMENT_HEIGHT = 256  # Height of each image fragment



import datetime

def save_processed_image(image, name, original_filename):
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    short_filename = os.path.splitext(original_filename)[0][:5]
    filename = f'records/images/{name}_{timestamp}_{short_filename}.png'
    image.save(filename)

    
def save_text_record(name, message):
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'records/messages/{timestamp}_{name}.txt'
    with open(filename, 'w') as f:
        f.write(f"Name: {name}\n{message}\n")

def save_image_record(image):
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'records/images/{timestamp}.png'
    image.save(filename)



def print_text(name, message):
    try:
        printer = Network(PRINTER_IP, PRINTER_PORT)
        reset_printer(printer)
        printer.text(f"Name: {name}\n")
        printer.text(f"{message}\n")
        printer.cut(mode='PART', feed=True)
        save_text_record(name, message)
    except Exception as e:
        print(f"Error printing text: {e}")
    finally:
        printer.close()


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

    try:
        # Connect to the printer
        printer = Network(PRINTER_IP, PRINTER_PORT)
        
        # Set the media width in the printer profile
        printer.profile.profile_data['media']['width']['pixels'] = PRINTER_WIDTH
        
        # Reset the printer before printing
        reset_printer(printer)
        
        # Send each fragment to the printer with a delay
        for fragment in fragments:
            printer.image(fragment)
            time.sleep(0.1)  # Add a small delay between fragments
        
        # Perform a partial cut instead of a full cut
        printer.cut(mode='PART', feed=True)
    except Exception as e:
        print(f"Error printing image: {e}")
    finally:
        # Reset and close the connection
        reset_printer(printer)
        printer.close()