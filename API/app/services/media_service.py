from sqlalchemy.orm import Session

from app.models.media_model import Media
from app.services.upload_service import save_file
from app.services.ai_service import analyze_image
from app.services.lyrics_matcher_service import lyrics_matcher
from app.schemas.media_schema import UploadMediaRequest


class MediaService:
    """Service for handling media uploads, vision analysis, and lyric matching."""

    def __init__(self, db: Session):
        self.db = db

    def upload_and_analyze(
        self,
        user_id: int,
        file,
        title: str
    ) -> Media:
        """Upload file, analyze with Gemini, match lyrics, and save to database."""
        try:
            # Save file
            file_path = save_file(user_id, file)

            # Analyze image with Gemini
            analysis = analyze_image(file_path)

            # Match top lyric captions from Spotify dataset
            captions = lyrics_matcher.find_matching_lyrics(analysis)

            # Prepare analysis data including matched captions
            analysis_data = analysis.model_dump()
            analysis_data['captions'] = [c.model_dump() for c in captions]

            # Save to database
            media = Media(
                user_id=user_id,
                title=title,
                file_url=f"/uploads/{user_id}/{file.filename}",
                file_path=file_path,
                analysis=analysis_data
            )

            self.db.add(media)
            self.db.commit()
            self.db.refresh(media)

            # Attach captions attribute for FastAPI response model
            setattr(media, 'captions', captions)

            return media

        except Exception as e:
            self.db.rollback()
            raise Exception(f"Upload and analysis failed: {e}")


def get_media_service(db: Session) -> MediaService:
    """Dependency for injecting MediaService."""
    return MediaService(db)
