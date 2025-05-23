# company_research_agent.py
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import FunctionTool
from ...shared_libraries import constants
from . import prompt
from ...tools.web_search import (
    go_to_url,
    take_screenshot,
    click_at_coordinates,
    find_element_with_text,
    click_element_with_text,
    enter_text_into_element,
    scroll_down_screen,
    get_page_source,
    analyze_webpage_and_determine_action,
)

# Instantiate tools for company research
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

company_research_agent = LlmAgent(
    model=constants.MODEL,
    name="company_research_agent",
    description="Perform extensive research on job postings and company details using web browsing",
    instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
    output_key="company_research",
    tools=tools,
)
