from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import media
from app.api.routes import health, upload
from app.db.database import engine, Base
from app.models.media_model import Media
from app.models.user_model import User


# Create tables
Base.metadata.create_all(bind=engine)

# Ensure a default user exists for uploads
from app.db.database import SessionLocal
with SessionLocal() as _db:
    if not _db.query(User).filter(User.id == 1).first():
        _db.add(User(id=1, name="Default User", email="default@example.com", active=True))
        _db.commit()

app = FastAPI(
    title="AI Media Enhancer API",
    version="1.0.0",
    description="Upload images and get AI-powered analysis with Spotify lyric captions"
)

from app.services.lyrics_matcher_service import lyrics_matcher

@app.on_event("startup")
def on_startup():
    lyrics_matcher.initialize()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(media.router)
app.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
)
app.include_router(
    upload.router,
    prefix="/upload",
    tags=["Upload"]
)


@app.get("/")
def root():
    return {
        "message": "AI Media Enhancer API is running 🚀",
        "docs": "/docs",
        "version": "1.0.0"
    }
