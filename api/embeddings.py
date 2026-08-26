import os
import numpy as np
from google import genai as google_genai
from google.genai import types

# 768 keeps us under pgvector's 2000-dim column limit and matches Google's
# recommended dimension for retrieval use cases.
EMBEDDING_DIM = 768

_client = google_genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


def get_embedding(text: str) -> list[float]:
    result = _client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM)
    )
    values = np.array(result.embeddings[0].values, dtype=np.float64)
    # Truncated (non-3072) Gemini embeddings aren't pre-normalized — renormalize
    # so cosine distance behaves correctly.
    norm = np.linalg.norm(values)
    if norm > 0:
        values = values / norm
    return values.tolist()


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    return [get_embedding(text) for text in texts]
