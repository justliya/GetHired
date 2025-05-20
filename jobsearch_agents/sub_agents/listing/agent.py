import time
from PIL import Image
import selenium
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from google.adk.agents.llm_agent import Agent
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.load_artifacts_tool import load_artifacts_tool
from google.genai import types
from tools.firestore import get_user_job_preferences
from . import prompt
from ...shared_libraries import constants

import warnings

warnings.filterwarnings("ignore", category=UserWarning)

if not constants.DISABLE_WEB_DRIVER:
    options = Options()
    options.add_argument("--window-size=1920x1080")
    options.add_argument("--verbose")
    options.add_argument("user-data-dir=/tmp/selenium")

    driver = selenium.webdriver.Chrome(options=options)
