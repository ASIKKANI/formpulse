import os

# Initialize ChromaDB and Embeddings with robust lazy-loading to avoid crashing startup
chroma_client = None
embedding_model = None

def get_chroma_client():
    global chroma_client
    if chroma_client is not None:
        return chroma_client
    try:
        import chromadb
        CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
        chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    except Exception as e:
        print(f"[WARN] ChromaDB could not be initialized (RAG disabled): {e}")
    return chroma_client

def get_embedding_model():
    global embedding_model
    if embedding_model is not None:
        return embedding_model
    try:
        from sentence_transformers import SentenceTransformer
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        print(f"[WARN] SentenceTransformer could not be initialized (RAG disabled): {e}")
    return embedding_model


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
    model = get_embedding_model()
    client = get_chroma_client()
    if not markdown_text or not model or not client:
        return
        
    collection = client.get_or_create_collection(name=f"form_{form_id}")
    
    chunks = simple_text_splitter(markdown_text)
    if not chunks:
        return
        
    embeddings = model.encode(chunks).tolist()
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
    model = get_embedding_model()
    client = get_chroma_client()
    if not model or not client:
        return ""
        
    try:
        collection = client.get_collection(name=f"form_{form_id}")
    except Exception:
        return ""
        
    query_embedding = model.encode([query]).tolist()
    
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )
    
    if not results["documents"] or not results["documents"][0]:
        return ""
        
    retrieved_text = "\n\n---\n\n".join(results["documents"][0])
    return retrieved_text
