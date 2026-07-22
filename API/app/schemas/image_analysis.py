from pydantic import BaseModel


class ImageAnalysis(BaseModel):
    scene: str
    mood: str
    people_count: int
    objects: list[str]
    colors: list[str]
    occasion: str