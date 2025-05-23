import time
import warnings
from typing import Any, Dict
from google.adk.tools import FunctionTool
from ..shared_libraries import constants
import selenium
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image

from google.adk.tools.tool_context import ToolContext
from google.genai import types

warnings.filterwarnings("ignore", category=UserWarning)

if not constants.DISABLE_WEB_DRIVER:
    options = Options()
    options.add_argument("--window-size=1920x1080")
    options.add_argument("--verbose")
    options.add_argument("--user-data-dir=/tmp/selenium")

    driver = selenium.webdriver.Chrome(options=options)


def go_to_url(url: str) -> Dict[str, Any]:
    """
    Navigates the browser to a specified URL.

    Use this tool when the user requests navigation to a webpage.

    Args:
        url: The target URL to navigate to.

    Returns:
        A dictionary containing:
        - status ("success" or "error").
        - message: Confirmation if successful.
        - error_message: Details if an error occurred.
    """
    try:
        print(f"Tool: go_to_url called with url={url}")
        driver.get(url.strip())
        return {"status": "success", "message": f"Navigated to URL: {url}"}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}


async def take_screenshot(tool_context: ToolContext) -> Dict[str, Any]:
    """
    Captures a screenshot of the current page and saves it as an artifact.

    Use this tool when the user asks to capture the browser view.

    Returns:
        A dictionary containing:
        - status ("success" or "error").
        - filename: The name of the saved screenshot file.
        - error_message: Details if an error occurred.
    """
    try:
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"screenshot_{timestamp}.png"
        print(f"Tool: take_screenshot saving as {filename}")
        driver.save_screenshot(filename)

        with open(filename, "rb") as img_file:
            data = img_file.read()

        part = types.Part.from_bytes(data=data, mime_type="image/png")
        version = await tool_context.save_artifact(filename, part)
        tool_context.actions.skip_summarization = True
        return {"status": "success", "filename": filename}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}


def click_at_coordinates(x: int, y: int) -> Dict[str, Any]:
    """
    Scrolls to and clicks at the specified screen coordinates.

    Args:
        x: The horizontal coordinate.
        y: The vertical coordinate.

    Returns:
        A dictionary containing:
        - status ("success" or "error").
        - message: Confirmation if successful.
        - error_message: Details if an error occurred.
    """
    try:
        print(f"Tool: click_at_coordinates called with x={x}, y={y}")
        driver.execute_script(f"window.scrollTo({x}, {y});")
        driver.find_element(By.TAG_NAME, "body").click()
        return {"status": "success", "message": f"Clicked at coordinates ({x}, {y})"}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}


def find_element_with_text(text: str) -> Dict[str, Any]:
    """
    Searches the page for an element containing the exact text.

    Args:
        text: The text to search for.

    Returns:
        A dictionary containing:
        - status ("success" or "error").
        - message: "Element found" if successful.
        - error_message: Details if not found or another error.
    """
    try:
        print(f"Tool: find_element_with_text called with text='{text}'")
        element = driver.find_element(By.XPATH, f"//*[text()='{text}']")
        return {"status": "success", "message": "Element found."}
    except selenium.common.exceptions.NoSuchElementException:
        return {"status": "error", "error_message": "Element not found."}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}


def click_element_with_text(text: str) -> Dict[str, Any]:
    """
    Clicks on an element matching the exact text.

    Args:
        text: The visible text of the element to click.

    Returns:
        A dictionary containing:
        - status ("success" or "error").
        - message: Confirmation if successful.
        - error_message: Details if an error occurred.
    """
    try:
        print(f"Tool: click_element_with_text called with text='{text}'")
        element = driver.find_element(By.XPATH, f"//*[text()='{text}']")
        element.click()
        return {"status": "success", "message": f"Clicked element with text: {text}"}
    except selenium.common.exceptions.NoSuchElementException:
        return {"status": "error", "error_message": "Element not found."}
    except selenium.common.exceptions.ElementNotInteractableException:
        return {"status": "error", "error_message": "Element not interactable."}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}


def enter_text_into_element(element_id: str, text_to_enter: str) -> Dict[str, Any]:
    """
    Enters text into an input field identified by its ID.

    Args:
        element_id: The ID attribute of the input field.
        text_to_enter: The text to input.

    Returns:
        A dictionary containing:
        - status ("success" or "error").
        - message: Confirmation if successful.
        - error_message: Details if an error occurred.
    """
    try:
        print(f"Tool: enter_text_into_element called with id='{element_id}', text='{text_to_enter}'")
        input_elem = driver.find_element(By.ID, element_id)
        input_elem.send_keys(text_to_enter)
        return {"status": "success", "message": f"Entered text into element ID: {element_id}"}
    except selenium.common.exceptions.NoSuchElementException:
        return {"status": "error", "error_message": "Element not found."}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}


def scroll_down_screen() -> Dict[str, Any]:
    """
    Scrolls down the page by a fixed amount.

    Returns:
        A dictionary containing:
        - status ("success").
        - message: Confirmation of scroll.
    """
    driver.execute_script("window.scrollBy(0, 500)")
    return {"status": "success", "message": "Scrolled down the screen."}


def get_page_source() -> Dict[str, Any]:
    """
    Retrieves the current page HTML source.

    Returns:
        A dictionary containing:
        - status ("success").
        - page_source: The HTML string (truncated if necessary).
    """
    LIMIT = 1000000
    source = driver.page_source
    return {"status": "success", "page_source": source[:LIMIT]}


def analyze_webpage_and_determine_action(page_source: str, user_task: str) -> Dict[str, Any]:
    """
    Generates an action plan based on the page content and user task.

    Args:
        page_source: The HTML source of the current page.
        user_task: A description of what the user wants to accomplish.

    Returns:
        A dictionary containing:
        - status ("success").
        - action_plan: A concise instruction for the next browser action.
    """
    analysis_prompt = f"""
You are an expert web page analyzer.
The user's task: {user_task}

Page content:\n{page_source}

Based on this, choose one action: COMPLETE_PAGE_SOURCE, SCROLL_DOWN, CLICK: <element_text>, ENTER_TEXT: <element_id>, TASK_COMPLETED, STUCK, or ASK_USER.
"""
    return {"status": "success", "action_plan": analysis_prompt}
go_to_url_tool = FunctionTool(func=go_to_url)
screenshot_tool = FunctionTool(func=take_screenshot)
click_coords_tool = FunctionTool(func=click_at_coordinates)
find_text_tool = FunctionTool(func=find_element_with_text)
click_text_tool = FunctionTool(func=click_element_with_text)
enter_text_tool = FunctionTool(func=enter_text_into_element)
scroll_tool = FunctionTool(func=scroll_down_screen)
page_source_tool = FunctionTool(func=get_page_source)
analyze_web_tool = FunctionTool(func=analyze_webpage_and_determine_action)

tools = [
    go_to_url_tool,
    screenshot_tool,
    click_coords_tool,
    find_text_tool,
    click_text_tool,
    enter_text_tool,
    scroll_tool,
    page_source_tool,
    analyze_web_tool,
]