from pydantic import BaseModel, Field
from app.schemas.image_analysis import ImageAnalysis
from app.schemas.lyrics_schema import MatchedCaption


class UploadMediaRequest(BaseModel):
    """Request schema for uploading media."""
    title: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Title of the media"
    )


class MediaResponse(BaseModel):
    """Response schema for uploaded media."""
    id: int
    user_id: int
    title: str
    file_url: str
    analysis: ImageAnalysis | None = None
    captions: list[MatchedCaption] = []

    class Config:
        from_attributes = True
