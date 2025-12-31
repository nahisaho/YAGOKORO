#!/usr/bin/env python3
"""
Language detection script using langdetect library.
ADR-008: Language Detection Library Selection

Usage:
    python detect_language.py <input_json>

Input JSON format:
    {"texts": ["text1", "text2", ...]}

Output JSON format:
    {"results": [{"language": "en", "confidence": 0.99, ...}, ...]}
"""

import json
import sys
from typing import TypedDict


class DetectionResult(TypedDict):
    language: str
    confidence: float
    requiresManualReview: bool
    alternatives: list[dict[str, float]]


class DetectionOutput(TypedDict):
    results: list[DetectionResult]
    error: str | None


def detect_language(text: str, confidence_threshold: float = 0.7) -> DetectionResult:
    """
    Detect language of a text using langdetect.

    Args:
        text: Text to detect language for
        confidence_threshold: Minimum confidence for auto-acceptance (REQ-008-09)

    Returns:
        DetectionResult with language, confidence, and alternatives
    """
    try:
        from langdetect import detect_langs
        from langdetect.lang_detect_exception import LangDetectException

        # Supported language mapping (langdetect codes to our codes)
        LANGUAGE_MAP = {
            "en": "en",
            "zh-cn": "zh",
            "zh-tw": "zh",
            "ja": "ja",
            "ko": "ko",
        }

        SUPPORTED = {"en", "zh", "ja", "ko"}

        try:
            # Get language probabilities
            results = detect_langs(text)

            if not results:
                return {
                    "language": "unknown",
                    "confidence": 0.0,
                    "requiresManualReview": True,
                    "alternatives": [],
                }

            # Map results to our language codes
            alternatives: list[dict[str, float]] = []
            for result in results:
                lang_code = LANGUAGE_MAP.get(result.lang, result.lang)
                if lang_code in SUPPORTED:
                    alternatives.append(
                        {"language": lang_code, "confidence": round(result.prob, 4)}
                    )

            # Get primary result
            if alternatives:
                primary = alternatives[0]
                language = primary["language"]
                confidence = primary["confidence"]
            else:
                # Detected language not in supported list
                language = "unknown"
                confidence = 0.0

            return {
                "language": language,
                "confidence": confidence,
                "requiresManualReview": confidence < confidence_threshold,
                "alternatives": alternatives[1:] if len(alternatives) > 1 else [],
            }

        except LangDetectException:
            return {
                "language": "unknown",
                "confidence": 0.0,
                "requiresManualReview": True,
                "alternatives": [],
            }

    except ImportError:
        return {
            "language": "unknown",
            "confidence": 0.0,
            "requiresManualReview": True,
            "alternatives": [],
        }


def main() -> None:
    """Main entry point for language detection."""
    try:
        # Read input from stdin or argument
        if len(sys.argv) > 1:
            input_data = json.loads(sys.argv[1])
        else:
            input_data = json.loads(sys.stdin.read())

        texts: list[str] = input_data.get("texts", [])
        threshold: float = input_data.get("confidenceThreshold", 0.7)

        results: list[DetectionResult] = []
        for text in texts:
            result = detect_language(text, threshold)
            results.append(result)

        output: DetectionOutput = {"results": results, "error": None}
        print(json.dumps(output))

    except json.JSONDecodeError as e:
        output: DetectionOutput = {"results": [], "error": f"JSON decode error: {e!s}"}
        print(json.dumps(output))
        sys.exit(1)
    except Exception as e:
        output: DetectionOutput = {"results": [], "error": f"Error: {e!s}"}
        print(json.dumps(output))
        sys.exit(1)


if __name__ == "__main__":
    main()
