from pydantic import BaseModel


class MatchedCaption(BaseModel):
    caption: str
    track_id: str
    track_name: str
    track_artist: str
    spotify_url: str
    genre: str
    match_score: int
