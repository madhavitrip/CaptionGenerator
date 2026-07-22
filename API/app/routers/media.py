from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.media_model import Media


router = APIRouter(
    prefix="/media",
    tags=["Media"]
)


@router.get("/")
def get_all_media(db: Session = Depends(get_db)):
    """Get all media files."""
    media_list = db.query(Media).all()
    return media_list


@router.get("/{media_id}")
def get_media(media_id: int, db: Session = Depends(get_db)):
    """Get a specific media file by ID."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return media


@router.delete("/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)):
    """Delete a media file."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    db.delete(media)
    db.commit()
    return {"message": "Media deleted successfully"}
