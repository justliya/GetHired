import logging
import typing

from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


def store_state_tool(
    state: dict[str, typing.Any], tool_context: ToolContext
) -> dict[str, str]:
    """Stores new state values in the ToolContext.

    Args:
      state: A dict of new state values.
      tool_context: ToolContext object.

    Returns:
      A dict with "status" and (optional) "error_message" keys.
    """
    logger.info("store_state_tool(): %s", state)
    tool_context.state.update(state)
    return {"status": "ok"}