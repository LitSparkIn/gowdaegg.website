import os
import uuid
from datetime import datetime
from fastapi import UploadFile
import aiofiles
from core.timezone import get_ist_now

UPLOAD_DIR = "/app/backend/uploads"

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def save_upload_file(file: UploadFile, prefix: str = "img") -> str:
    """
    Save an uploaded file and return the relative URL path.
    
    Args:
        file: The uploaded file
        prefix: Prefix for the filename (e.g., 'sale', 'report')
    
    Returns:
        The relative URL path to access the file (e.g., /uploads/sale_xxx.jpg)
    """
    if not file or not file.filename:
        return None
    
    # Get file extension
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique filename using IST
    timestamp = get_ist_now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{prefix}_{timestamp}_{unique_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB")
        await out_file.write(content)
    
    # Return relative URL path
    return f"/api/uploads/{filename}"


def delete_upload_file(file_url: str) -> bool:
    """
    Delete an uploaded file.
    
    Args:
        file_url: The URL path of the file (e.g., /api/uploads/sale_xxx.jpg)
    
    Returns:
        True if deleted, False otherwise
    """
    if not file_url:
        return False
    
    # Extract filename from URL
    filename = file_url.split("/")[-1]
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    return False
