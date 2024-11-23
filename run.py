from app import create_app
from logging_config import setup_logging

setup_logging()
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5001)