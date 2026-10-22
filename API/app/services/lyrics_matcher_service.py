import os
import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.schemas.image_analysis import ImageAnalysis
from app.schemas.lyrics_schema import MatchedCaption


class LyricsMatcherService:
    """Service to semantically match image mood and scenes with song lyrics."""

    _instance = None

    def __init__(self):
        self.df = None
        self.vectorizer = None
        self.tfidf_matrix = None
        self._is_initialized = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def initialize(self):
        """Loads and indexes the Spotify lyrics dataset."""
        if self._is_initialized:
            return

        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
            "spotify_songs.csv"
        )

        if not os.path.exists(csv_path):
            print(f"[LyricsMatcher] Dataset not found at: {csv_path}")
            return

        print("[LyricsMatcher] Loading Spotify songs dataset...")
        raw_df = pd.read_csv(csv_path)

        # Filter to English songs with lyrics and good popularity
        filtered = raw_df[
            (raw_df['language'] == 'en') &
            (raw_df['lyrics'].notna()) &
            (raw_df['track_popularity'] >= 30)
        ].copy()

        # Deduplicate identical song titles by the same artist
        filtered = filtered.drop_duplicates(subset=['track_name', 'track_artist']).reset_index(drop=True)
        self.df = filtered

        print(f"[LyricsMatcher] Indexing {len(self.df)} Spotify tracks with lyrics...")
        self.vectorizer = TfidfVectorizer(
            max_features=12000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df['lyrics'].values)
        self._is_initialized = True
        print("[LyricsMatcher] Lyrics index ready!")

    def _split_lyrics_into_lines(self, lyrics: str) -> list[str]:
        """Splits long text lyrics into readable lines/sentences."""
        if not lyrics or not isinstance(lyrics, str):
            return []

        # Split on newlines if present, or on uppercase transitions / punctuation
        if '\n' in lyrics:
            lines = [l.strip() for l in lyrics.split('\n') if len(l.strip()) > 8]
        else:
            lines = re.split(r'(?<=[a-z0-9,;])\s+(?=[A-Z])', lyrics)

        # Filter out junk lines or tags
        cleaned = [
            l.strip().strip('"').strip("'")
            for l in lines
            if len(l.strip()) > 10 and not l.strip().startswith('[')
        ]
        return cleaned

    def _extract_best_caption_lines(self, lyrics: str, query_words: set) -> str:
        """Finds the most thematic 1-2 consecutive lines from the song lyrics."""
        lines = self._split_lyrics_into_lines(lyrics)
        if not lines:
            return lyrics[:120] + "..."

        best_score = -1
        best_idx = 0

        for i in range(len(lines)):
            # Check 1-line or 2-line couplet
            couplet = " ".join(lines[i:i + 2])
            words = set(re.findall(r'\w+', couplet.lower()))
            score = len(words.intersection(query_words))

            if score > best_score:
                best_score = score
                best_idx = i

        selected_lines = lines[best_idx:best_idx + 2]
        return " / ".join(selected_lines)

    def find_matching_lyrics(self, analysis: ImageAnalysis, limit: int = 4) -> list[MatchedCaption]:
        """Finds the top songs and lyric captions matching the image analysis."""
        if not self._is_initialized:
            self.initialize()

        if self.df is None or self.vectorizer is None or self.tfidf_matrix is None:
            return self._fallback_captions(analysis)

        # Construct comprehensive search query from image attributes
        objects_str = " ".join(analysis.objects or [])
        colors_str = " ".join(analysis.colors or [])
        query = f"{analysis.mood} {analysis.scene} {analysis.occasion} {objects_str} {colors_str}".strip()

        if not query:
            query = "life love beautiful happiness"

        query_vec = self.vectorizer.transform([query])
        sims = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Boost slightly by popularity
        popularity_boost = (self.df['track_popularity'].values / 100.0) * 0.15
        final_scores = (sims * 0.85) + popularity_boost

        top_indices = np.argsort(final_scores)[::-1][:limit]
        query_words = set(re.findall(r'\w+', query.lower()))

        results = []
        for rank, idx in enumerate(top_indices):
            row = self.df.iloc[idx]
            raw_lyrics = str(row['lyrics'])

            caption_lines = self._extract_best_caption_lines(raw_lyrics, query_words)
            raw_sim = float(sims[idx])

            # Convert to a natural match percentage (65% to 98%)
            match_pct = int(min(98, max(65, 70 + raw_sim * 100)))

            results.append(
                MatchedCaption(
                    caption=f'"{caption_lines}"',
                    track_id=str(row['track_id']),
                    track_name=str(row['track_name']),
                    track_artist=str(row['track_artist']),
                    spotify_url=f"https://open.spotify.com/track/{row['track_id']}",
                    genre=str(row.get('playlist_genre', 'Music')).title(),
                    match_score=match_pct
                )
            )

        return results

    def _fallback_captions(self, analysis: ImageAnalysis) -> list[MatchedCaption]:
        """Fallback captions in case the CSV index cannot be read."""
        mood = analysis.mood or "Serene"
        return [
            MatchedCaption(
                caption=f'"Living for moments that make your soul smile and your heart sing."',
                track_id="4cOdK2wGLETKBW3PvgPWqT",
                track_name="Golden Hour",
                track_artist="JVKE",
                spotify_url="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
                genre="Pop",
                match_score=92
            )
        ]


lyrics_matcher = LyricsMatcherService.get_instance()
