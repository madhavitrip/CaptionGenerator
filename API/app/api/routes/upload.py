from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.media_service import MediaService, get_media_service
from app.schemas.media_schema import MediaResponse


router = APIRouter()


@router.post("/image", response_model=MediaResponse)
def upload_image(
    user_id: int = Query(..., description="User ID"),
    title: str = Query(..., description="Media title"),
    file: UploadFile = File(..., description="Image file to upload"),
    db: Session = Depends(get_db)
):
    """Upload and analyze an image using Gemini API."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        media_service = get_media_service(db)
        media = media_service.upload_and_analyze(user_id, file, title)
        return media
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
