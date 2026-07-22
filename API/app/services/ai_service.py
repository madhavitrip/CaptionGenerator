import json
import google.generativeai as genai

from app.core.config import settings
from app.schemas.image_analysis import ImageAnalysis


# Configure with API key
genai.configure(api_key=settings.gemini_api_key)

ANALYSIS_PROMPT = """Analyze this image and provide a detailed analysis in JSON format with the following structure:
{
    "scene": "description of the scene",
    "mood": "mood or atmosphere",
    "people_count": number,
    "objects": ["list", "of", "objects"],
    "colors": ["primary", "colors"],
    "occasion": "type of occasion or context"
}
Only respond with valid JSON, no other text."""


def analyze_image(image_path: str) -> ImageAnalysis:
    """Analyze image using Gemini API and return structured analysis."""
    try:
        # For testing/demo: use mock response if real API fails
        # In production, remove this and use real API
        return _analyze_with_gemini(image_path)
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback to mock analysis for demo purposes
        print("Using mock analysis for demo...")
        return _mock_analysis()


def _analyze_with_gemini(image_path: str) -> ImageAnalysis:
    """Call real Gemini API."""
    # Load image file
    image = genai.upload_file(path=image_path)
    
    # Create model and generate analysis
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content([image, ANALYSIS_PROMPT])
    
    # Parse JSON response
    analysis_dict = json.loads(response.text)
    return ImageAnalysis(**analysis_dict)


def _mock_analysis() -> ImageAnalysis:
    """Mock analysis for testing without Gemini API."""
    return ImageAnalysis(
        scene="A beautiful outdoor landscape",
        mood="Peaceful and serene",
        people_count=0,
        objects=["tree", "grass", "sky", "clouds"],
        colors=["green", "blue", "white"],
        occasion="Nature photography"
    )

