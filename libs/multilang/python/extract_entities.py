#!/usr/bin/env python3
"""
Named Entity Recognition script using spaCy.
ADR-007: Multilingual NER with spaCy language models

Usage:
    python extract_entities.py <input_json>

Input JSON format:
    {"text": "...", "language": "en", "model": "en_core_web_sm"}

Output JSON format:
    {"entities": [...], "error": null}
"""

import json
import sys
from typing import TypedDict


class Entity(TypedDict):
    text: str
    type: str
    start: int
    end: int
    confidence: float
    language: str


class ExtractionOutput(TypedDict):
    entities: list[Entity]
    error: str | None


# Map spaCy entity types to our types
ENTITY_TYPE_MAP = {
    "PERSON": "PERSON",
    "ORG": "ORG",
    "GPE": "ORG",  # Geopolitical entities -> ORG
    "PRODUCT": "TECH",
    "WORK_OF_ART": "TECH",  # Often paper titles
    "EVENT": "METHOD",
    "LAW": "METHOD",
    "LANGUAGE": "TECH",
    "NORP": "ORG",  # Nationalities, religious, political groups
    # Custom types for academic papers
    "TECH": "TECH",
    "METHOD": "METHOD",
    "DATASET": "DATASET",
    "METRIC": "METRIC",
    "TASK": "TASK",
}


def extract_entities(text: str, language: str, model: str) -> list[Entity]:
    """
    Extract named entities from text using spaCy.

    Args:
        text: Text to extract entities from
        language: Language code (en, zh, ja, ko)
        model: spaCy model name

    Returns:
        List of extracted entities
    """
    try:
        import spacy

        # Load the appropriate model
        try:
            nlp = spacy.load(model)
        except OSError:
            # Model not found, try to download
            from spacy.cli import download

            download(model)
            nlp = spacy.load(model)

        # Process the text
        doc = nlp(text)

        entities: list[Entity] = []

        for ent in doc.ents:
            entity_type = ENTITY_TYPE_MAP.get(ent.label_, ent.label_)

            # Calculate confidence (spaCy doesn't provide this directly)
            # Use a heuristic based on entity length and type
            confidence = calculate_confidence(ent, doc)

            entities.append(
                {
                    "text": ent.text,
                    "type": entity_type,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "confidence": confidence,
                    "language": language,
                }
            )

        # Add custom entity detection for AI/ML specific terms
        custom_entities = extract_custom_entities(text, language, doc)
        entities.extend(custom_entities)

        # Deduplicate entities
        seen = set()
        unique_entities = []
        for entity in entities:
            key = (entity["text"].lower(), entity["type"])
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)

        return unique_entities

    except ImportError as e:
        raise RuntimeError(f"spaCy not available: {e}") from e


def calculate_confidence(ent, doc) -> float:
    """Calculate confidence score for an entity."""
    # Base confidence
    confidence = 0.7

    # Boost for longer entities (more context)
    if len(ent.text) > 3:
        confidence += 0.1

    # Boost for capitalized entities
    if ent.text[0].isupper():
        confidence += 0.1

    # Boost for known entity types
    if ent.label_ in ["PERSON", "ORG", "PRODUCT"]:
        confidence += 0.1

    return min(confidence, 1.0)


def extract_custom_entities(text: str, language: str, doc) -> list[Entity]:
    """
    Extract custom AI/ML specific entities using pattern matching.
    """
    import re

    entities: list[Entity] = []

    # Common AI/ML terms patterns
    patterns = {
        "TECH": [
            r"\b(GPT-\d+|BERT|RoBERTa|T5|BART|XLNet|ALBERT|DistilBERT)\b",
            r"\b(Transformer|LSTM|GRU|CNN|RNN|GAN|VAE|Autoencoder)\b",
            r"\b(Adam|SGD|AdamW|LAMB|RAdam)\b",  # Optimizers
            r"\b(ReLU|GELU|Softmax|LayerNorm|BatchNorm)\b",  # Components
        ],
        "METHOD": [
            r"\b(attention mechanism|self-attention|cross-attention)\b",
            r"\b(fine-tuning|pre-training|transfer learning)\b",
            r"\b(backpropagation|gradient descent)\b",
            r"\b(reinforcement learning|supervised learning|unsupervised learning)\b",
        ],
        "DATASET": [
            r"\b(ImageNet|COCO|MNIST|CIFAR-\d+|WikiText|SQuAD|GLUE)\b",
            r"\b(Common Crawl|BookCorpus|Wikipedia corpus)\b",
        ],
        "METRIC": [
            r"\b(accuracy|precision|recall|F1|BLEU|ROUGE|perplexity)\b",
            r"\b(AUC|ROC|MAP|IoU|mAP)\b",
        ],
        "TASK": [
            r"\b(classification|segmentation|detection|generation)\b",
            r"\b(translation|summarization|question answering|NER)\b",
            r"\b(sentiment analysis|named entity recognition)\b",
        ],
    }

    for entity_type, pattern_list in patterns.items():
        for pattern in pattern_list:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append(
                    {
                        "text": match.group(),
                        "type": entity_type,
                        "start": match.start(),
                        "end": match.end(),
                        "confidence": 0.85,  # Pattern matches are fairly reliable
                        "language": language,
                    }
                )

    return entities


def main() -> None:
    """Main entry point for entity extraction."""
    try:
        # Read input from argument
        if len(sys.argv) > 1:
            input_data = json.loads(sys.argv[1])
        else:
            input_data = json.loads(sys.stdin.read())

        text: str = input_data.get("text", "")
        language: str = input_data.get("language", "en")
        model: str = input_data.get("model", "en_core_web_sm")

        if not text:
            output: ExtractionOutput = {"entities": [], "error": None}
            print(json.dumps(output))
            return

        entities = extract_entities(text, language, model)
        output: ExtractionOutput = {"entities": entities, "error": None}
        print(json.dumps(output))

    except json.JSONDecodeError as e:
        output: ExtractionOutput = {"entities": [], "error": f"JSON decode error: {e!s}"}
        print(json.dumps(output))
        sys.exit(1)
    except Exception as e:
        output: ExtractionOutput = {"entities": [], "error": f"Error: {e!s}"}
        print(json.dumps(output))
        sys.exit(1)


if __name__ == "__main__":
    main()
