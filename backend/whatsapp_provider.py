import os
import httpx

OPENWA_API_KEY = os.getenv("OPENWA_API_KEY", "formpulse_openwa_key")
OPENWA_BASE_URL = os.getenv("OPENWA_BASE_URL", "http://localhost:2785/api")

def send_whatsapp_message(number: str, text: str):
    """
    Sends a WhatsApp message via local OpenWA Gateway.
    """
    url = f"{OPENWA_BASE_URL}/sessions/default/messages/send-text"
    
    # Format number for WhatsApp
    clean_number = "".join(c for c in number if c.isdigit())
    chat_id = f"{clean_number}@c.us"

    payload = {
        "chatId": chat_id,
        "text": text
    }
    
    headers = {
        "X-API-Key": OPENWA_API_KEY
    }
    
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
        response.raise_for_status()
        print(f"WhatsApp message sent successfully via OpenWA to {clean_number}")
        return response.json()
    except Exception as e:
        print(f"Failed to send WhatsApp message via OpenWA: {e}")
        return None
