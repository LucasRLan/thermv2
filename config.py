import os

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'records/images')
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

class Config:
    UPLOAD_FOLDER = UPLOAD_FOLDER
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH