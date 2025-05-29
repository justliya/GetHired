import time
from mcp.server.fastmcp import FastMCP
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
# Requires: pip install sse-starlette
from sse_starlette.sse import EventSourceResponse
import json

app = FastAPI()

class NavigateRequest(BaseModel):
    url: str
    timeout: int = 10

class ClickRequest(BaseModel):
    text: str
    timeout: int = 5

class ScrollRequest(BaseModel):
    pixels: int = 1000
    timeout: int = 2

class AnalyzeRequest(BaseModel):
    html: str
    actions: list = None

# Initialize MCP for browser automation
mcp = FastMCP("job_search")
   

def go_to_url(url: str, timeout: int = 10) -> None:
    """
    Navigate the browser to the specified URL and wait for it to load.

    :param url: The URL to navigate to.
    :param timeout: Time in seconds to wait after navigating.
    """
    # Instruct MCP to open the URL
    mcp.call("browser.navigate", {"url": url})
    # Simple wait; for robustness, consider waiting for specific elements
    time.sleep(timeout)


def get_page_source() -> str:
    """
    Retrieve the current page's HTML source via MCP.

    :return: HTML content as a string.
    """
    response = mcp.call("browser.get_html", {})
    # MCP should return a dict with 'html' key
    return response.get("html", "")


def click_element_with_text(text: str, timeout: int = 5) -> None:
    """
    Find and click the first element matching the visible text.

    :param text: The exact visible text of the target element.
    :param timeout: Time in seconds to wait after clicking.
    """
    mcp.call("browser.find_and_click", {"text": text})
    time.sleep(timeout)


def scroll_down_screen(pixels: int = 1000, timeout: int = 2) -> None:
    """
    Scroll down the page by the specified number of pixels.

    :param pixels: Number of pixels to scroll vertically.
    :param timeout: Time in seconds to wait after scrolling.
    """
    mcp.call("browser.scroll", {"x": 0, "y": pixels})
    time.sleep(timeout)


def analyze_webpage_and_determine_action(html: str, actions: list = None) -> dict:
    """
    Placeholder tool for ADK: allows the LLM to inspect the page HTML and decide the next action.

    :param html: The HTML content of the current page.
    :param actions: List of previously executed actions (optional).
    :return: A dict representing the next tool call, e.g., {"action": "scroll", "args": {"pixels": 500}}
    """
    # The ADK agent runtime will handle this tool; implementation is provided by the agent framework.
    return {"action": None, "args": {}}


@app.post("/navigate")
async def http_go_to_url(req: NavigateRequest):
    try:
        go_to_url(req.url, req.timeout)
        return {"status": "navigated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/html")
async def http_get_html():
    try:
        html = get_page_source()
        return {"html": html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/click")
async def http_click(req: ClickRequest):
    try:
        click_element_with_text(req.text, req.timeout)
        return {"status": "clicked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scroll")
async def http_scroll(req: ScrollRequest):
    try:
        scroll_down_screen(req.pixels, req.timeout)
        return {"status": "scrolled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def http_analyze(req: AnalyzeRequest):
    try:
        result = analyze_webpage_and_determine_action(req.html, req.actions)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sse")
async def sse_stream():
    """
    SSE endpoint to stream available tool metadata to MCP clients.
    """
    async def event_generator():
        tools_meta = [
            {"name": "navigate", "method": "POST", "path": "/navigate"},
            {"name": "html",     "method": "GET",  "path": "/html"},
            {"name": "click",    "method": "POST", "path": "/click"},
            {"name": "scroll",   "method": "POST", "path": "/scroll"},
            {"name": "analyze",  "method": "POST", "path": "/analyze"},
        ]
        payload = {"tools": tools_meta}
        yield f"data: {json.dumps(payload)}\n\n"
    return EventSourceResponse(event_generator())
