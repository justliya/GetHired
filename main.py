import os
import json
import asyncio
import base64
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from google.genai.types import Part, Content, Blob
from google.adk.runners import Runner
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.adk.sessions.in_memory_session_service import InMemorySessionService

from jobsearch_agents.jobsearch_agents.sub_agents.listing.agent import listing_search_agent

# Load env vars
load_dotenv()

APP_NAME = "JobSearchAgent Streaming"
session_service = InMemorySessionService()

# CORS (for frontend to fetch without errors)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # limit this to your frontend in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend if needed
STATIC_DIR = Path("static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def root():
    return FileResponse(STATIC_DIR / "index.html")

# Create and run agent session
async def start_agent_session(session_id: str, is_audio=False):
    print(f"🎯 Starting session {session_id}, audio={is_audio}")

    session = await session_service.create_session(
        app_name=APP_NAME,
        user_id=session_id,
        session_id=session_id,
    )

    runner = Runner(
        app_name=APP_NAME,
        agent=listing_search_agent,
        session_service=session_service,
    )

    modality = "AUDIO" if is_audio else "TEXT"
    run_config = RunConfig(response_modalities=[modality])
    live_request_queue = LiveRequestQueue()

    live_events = runner.run_live(
        session=session,
        live_request_queue=live_request_queue,
        run_config=run_config,
    )

    return live_events, live_request_queue

# AGENT → CLIENT
async def agent_to_client_messaging(websocket, live_events):
    async for event in live_events:
        if event.turn_complete or event.interrupted:
            await websocket.send_text(json.dumps({
                "turn_complete": event.turn_complete,
                "interrupted": event.interrupted,
            }))
            continue

        part: Part = event.content and event.content.parts[0] if event.content else None
        if not part:
            continue

        # Audio stream
        if part.inline_data and part.inline_data.mime_type.startswith("audio/pcm"):
            audio_data = part.inline_data.data
            await websocket.send_text(json.dumps({
                "mime_type": "audio/pcm",
                "data": base64.b64encode(audio_data).decode("ascii")
            }))
            continue

        # Text or JSON stream
        if part.text:
            try:
                parsed = json.loads(part.text)
                await websocket.send_text(json.dumps({
                    "mime_type": "application/json",
                    "data": parsed
                }))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "mime_type": "text/plain",
                    "data": part.text
                }))

# CLIENT → AGENT
async def client_to_agent_messaging(websocket, live_request_queue):
    try:
        while True:
            message_json = await websocket.receive_text()
            message = json.loads(message_json)
            mime_type = message.get("mime_type")
            data = message.get("data")

            if mime_type == "text/plain":
                content = Content(role="user", parts=[Part.from_text(text=data)])
                live_request_queue.send_content(content=content)
            elif mime_type == "audio/pcm":
                decoded_data = base64.b64decode(data)
                live_request_queue.send_realtime(Blob(data=decoded_data, mime_type=mime_type))
    except Exception as e:
        print(f"❌ Error in client_to_agent_messaging: {e}")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int, is_audio: str):
    await websocket.accept()
    try:
        if is_audio.lower() not in ["true", "false"]:
            raise ValueError("Invalid is_audio value")

        live_events, live_request_queue = await start_agent_session(
            str(session_id), is_audio.lower() == "true"
        )

        await asyncio.gather(
            agent_to_client_messaging(websocket, live_events),
            client_to_agent_messaging(websocket, live_request_queue),
        )
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        await websocket.close()