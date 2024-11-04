from flask import Flask
import os

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'records/images')
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

class config:
    UPLOAD_FOLDER = UPLOAD_FOLDER
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH


def create_app():
    app = Flask(__name__)
    app.config.from_object("config")

    with app.app_context():
        from . import routes
        app.register_blueprint(routes.bp)

    return app