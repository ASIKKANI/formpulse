# FormPulse Implementation TODOs

This document outlines the four major feature integrations required for the next phase of FormPulse.

## 1. WhatsApp Native Integration & Router Webhook
**Objective:** Enable respondents to complete surveys entirely within WhatsApp using a conversational interface.
**Tasks:**
- [ ] Set up a FastAPI webhook endpoint (`/api/webhooks/whatsapp`) to receive incoming messages via Twilio API or Meta WhatsApp Cloud API.
- [ ] Implement a **Backend Router Agent**:
  - Handle incoming messages on a single unified WhatsApp number.
  - Parse deep-link hashes or initial keywords (e.g., "Start Survey 123") to route the user to the correct isolated survey session.
- [ ] Maintain conversation state mapping (WhatsApp Phone Number -> Active Session ID).
- [ ] Format LLM text responses to be WhatsApp-friendly (e.g., using bolding `*text*`, italics, and concise spacing).

## 2. Voice Agent / Telephony Integration (IVR Calls)
**Objective:** Allow the AI surveyor to conduct interviews over an actual phone call.
**Tasks:**
- [ ] Set up a Twilio Voice integration with a FastAPI webhook endpoint (TwiML).
- [ ] Implement **Speech-to-Text (STT)**: Stream or capture the user's voice response from the call and transcribe it in real-time (using Groq Whisper or Twilio's built-in transcription).
- [ ] Implement **Text-to-Speech (TTS)**: Convert the AI's generated response into human-like audio (e.g., using ElevenLabs or Twilio's native TTS) and stream it back into the call.
- [ ] Manage call state and silence detection to know when the user has finished speaking and when the AI should respond.
- [ ] Map the transcribed answers into the standard FormPulse database structure.

## 3. Outbound Data Webhooks (Downstream Integrations)
**Objective:** Push finalized, structured survey data to external systems the moment a respondent finishes a survey.
**Tasks:**
- [ ] Update the `Form` database model to include a `webhook_url` and `webhook_secret` field.
- [ ] Create a webhook dispatch engine triggered when a `SurveySession` state changes to `completed` (or when `form_complete == True`).
- [ ] Construct a standardized JSON payload containing:
  - Form Metadata
  - The structured, extracted variables
  - Conversation fatigue/sentiment rating
- [ ] Implement retry logic and asynchronous dispatch (e.g., using `asyncio.create_task` or a background task queue) to ensure the API doesn't hang while pushing data to Slack, Discord, Zapier, or custom APIs.

## 4. Inline Widget / Mobile SDK Bottom-Sheet Simulator
**Objective:** Provide a seamless way for SaaS applications and websites to embed FormPulse directly into their UI without redirecting users.
**Tasks:**
- [ ] Create a lightweight, embeddable Vanilla JavaScript script (`formpulse-widget.js`).
- [ ] Implement a floating action button (FAB) or trigger mechanism.
- [ ] Build an interactive bottom-sheet or side-panel UI that opens over the host website.
- [ ] Use `iframe` embedding or direct Shadow DOM injection to render the FormPulse chat interface.
- [ ] Ensure the widget handles responsive design (mobile-friendly bottom sheet vs. desktop sidebar) and supports theming (Dark/Light mode).
- [ ] Document the SDK usage (e.g., `<script src="..."></script>` and initialization functions).
