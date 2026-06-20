import os
import chromadb
from sentence_transformers import SentenceTransformer

# Initialize ChromaDB
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

# Initialize embedding model locally
try:
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception as e:
    print(f"Warning: Could not load SentenceTransformer model. RAG may fail. Error: {e}")
    embedding_model = None

def simple_text_splitter(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def index_document(form_id: str, markdown_text: str):
    """
    Chunks the document and stores it in ChromaDB under the form_id collection.
    """
    if not markdown_text or not embedding_model:
        return
        
    collection = chroma_client.get_or_create_collection(name=f"form_{form_id}")
    
    chunks = simple_text_splitter(markdown_text)
    if not chunks:
        return
        
    embeddings = embedding_model.encode(chunks).tolist()
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    
    # Add to collection. We do this in smaller batches to avoid memory issues if doc is huge.
    collection.add(
        embeddings=embeddings,
        documents=chunks,
        ids=ids
    )

def query_document(form_id: str, query: str, top_k: int = 3) -> str:
    """
    Queries the vector database for the given form_id.
    Returns the concatenated text of the top K most relevant chunks.
    """
    if not embedding_model:
        return ""
        
    try:
        collection = chroma_client.get_collection(name=f"form_{form_id}")
    except Exception:
        return ""
        
    query_embedding = embedding_model.encode([query]).tolist()
    
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )
    
    if not results["documents"] or not results["documents"][0]:
        return ""
        
    retrieved_text = "\n\n---\n\n".join(results["documents"][0])
    return retrieved_text
