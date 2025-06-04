import os
import logging
import subprocess
from typing import Optional, List, Dict
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, MCPTool,SseServerParams, StdioServerParameters


logger = logging.getLogger(__name__)

class CloudRunMCPWrapper:
    """Wrapper for MCP tools that handles both local and external servers."""
    
    def __init__(self):
        self.is_cloud_run = os.environ.get("K_SERVICE") is not None
        logger.info(f"MCPWrapper initialized. Cloud Run: {self.is_cloud_run}")
        
    def create_toolset(
        self, 
        server_command: Optional[List[str]] = None,
        server_args: Optional[List[str]] = None,
        server_env: Optional[Dict[str, str]] = None,
        external_url: Optional[str] = None,
        tool_filter: Optional[List[str]] = None,
        tools: Optional[List[MCPTool]] = None
    ) -> MCPToolset:
        """Create an MCP toolset with appropriate configuration."""
        
        # For external URLs
        if external_url:
            server_params = SseServerParams(url=external_url)
            logger.info(f"Using external MCP server at {external_url}")
            
        # For local servers (like Firebase MCP)
        elif server_command:
            # Prepare environment
            env = os.environ.copy()
            if server_env:
                env.update(server_env)
                
            # Log environment for debugging
            logger.info(f"MCP server environment: {server_env}")
            
            # Verify the command exists
            if server_command == "npx":
                try:
                    result = subprocess.run(["which", "npx"], capture_output=True, text=True)
                    logger.info(f"npx location: {result.stdout.strip()}")
                except Exception as e:
                    logger.error(f"Failed to locate npx: {e}")
            
            server_params = StdioServerParameters(
                command=server_command,
                args=server_args or [],
                env=env
            )
            logger.info(f"Using stdio for local MCP server: {server_command} {server_args}")
            
        else:
            server_params = None
            logger.warning("No server configuration provided")
        
        # Create the toolset
        kwargs = {"connection_params": server_params}
        
        if tool_filter:
            kwargs["tool_filter"] = tool_filter
            
        if tools:
            kwargs["tools"] = tools
            
        try:
            toolset = MCPToolset(**kwargs)
            logger.info(f"MCPToolset created successfully")
            return toolset
        except Exception as e:
            logger.error(f"Failed to create MCPToolset: {e}", exc_info=True)
            raise
    
    def cleanup(self):
        """Cleanup method."""
        logger.info("Cleanup called")

# Global instance
mcp_wrapper = CloudRunMCPWrapper()