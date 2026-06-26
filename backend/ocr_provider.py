import os
import httpx

OCR_API_KEY = os.getenv("OCR_API_KEY", "")
OCR_API_URL = "https://api.ocr.space/parse/image"

def parse_document(file_path: str) -> str:
    """
    Parses an image or PDF using the OCR.space API.
    Returns the extracted text.
    """
    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f)}
            data = {
                "apikey": OCR_API_KEY,
                "OCREngine": "2", # Engine 2 is recommended for complex formatting
                "language": "eng",
                "isOverlayRequired": "false"
            }
            
            with httpx.Client(timeout=60.0) as client:
                response = client.post(OCR_API_URL, data=data, files=files)
                response.raise_for_status()
                
                result = response.json()
                
                if result.get("IsErroredOnProcessing"):
                    err_msg = result.get("ErrorMessage", "Unknown OCR Error")
                    print(f"OCR API Error: {err_msg}")
                    return ""
                
                parsed_text = ""
                for parsed_result in result.get("ParsedResults", []):
                    parsed_text += parsed_result.get("ParsedText", "") + "\n\n"
                    
                return parsed_text.strip()
    except Exception as e:
        print(f"Error in OCR parsing: {e}")
        return ""
