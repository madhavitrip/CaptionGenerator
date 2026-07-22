import os
import shutil
import uuid
from fastapi import UploadFile


UPLOAD_DIR = "uploads"


def save_file(user_id: int, file: UploadFile) -> str:
    """Save uploaded file to user-specific directory."""
    user_folder = os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_folder, exist_ok=True)
    
    _, extension = os.path.splitext(file.filename)
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(user_folder, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path












