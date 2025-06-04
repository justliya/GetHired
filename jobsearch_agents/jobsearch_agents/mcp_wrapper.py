import os
import asyncio
import subprocess
from typing import Optional, List
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, MCPTool
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams, StdioServerParameters
import logging

logger = logging.getLogger(__name__)

class CloudRunMCPWrapper:
    """Wrapper for MCP tools that handles Cloud Run environment."""
    
    def __init__(self):
        self.is_cloud_run = os.environ.get("K_SERVICE") is not None  # Cloud Run sets this
        self.mcp_servers = {}
        
    async def start_mcp_server(self, name: str, command: List[str], port: int) -> Optional[subprocess.Popen]:
        """Start an MCP server process."""
        if not self.is_cloud_run:
            return None
            
        try:
            # Start the MCP server process
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env={**os.environ, "PORT": str(port)}
            )
            
            # Wait a bit for the server to start
            await asyncio.sleep(2)
            
            # Check if process is still running
            if process.poll() is None:
                logger.info(f"Started MCP server '{name}' on port {port}")
                self.mcp_servers[name] = process
                return process
            else:
                stdout, stderr = process.communicate()
                logger.error(f"MCP server '{name}' failed to start: {stderr.decode()}")
                return None
                
        except Exception as e:
            logger.error(f"Error starting MCP server '{name}': {e}")
            return None
    
    def create_toolset(
        self, 
        server_command: Optional[List[str]] = None,
        port: Optional[int] = None,
        external_url: Optional[str] = None,
        tool_filter: Optional[List[str]] = None,
        tools: Optional[List[MCPTool]] = None
    ) -> MCPToolset:
        """Create an MCP toolset with appropriate configuration."""
        
        # If external URL is provided, use it directly
        if external_url:
            server_params = StreamableHTTPServerParams(url=external_url)
            logger.info(f"Using external MCP server for {external_url}")
            
        elif self.is_cloud_run and server_command and port:
            # In Cloud Run with local server
            server_params = StreamableHTTPServerParams(
                url=f"http://localhost:{port}"
            )
            # Start the server asynchronously
            asyncio.create_task(self.start_mcp_server( server_command, port))
            
        elif not self.is_cloud_run and server_command:
            # In local development, use stdio
            server_params = StdioServerParameters(
                command=server_command[0],
                args=server_command[1:] if len(server_command) > 1 else []
            )
        else:
            # No server needed
            server_params = None
        
        # Create the toolset with the correct parameter name
        kwargs = {
            "connection_params": server_params,  # Use StreamableHTTPServerParams or StdioServerParameters
            
        }
        
        # Add tool_filter if provided
        if tool_filter:
            kwargs["tool_filter"] = tool_filter
            
        return MCPToolset(**kwargs)
    
    def cleanup(self):
        """Clean up any running MCP servers."""
        for name, process in self.mcp_servers.items():
            if process.poll() is None:
                logger.info(f"Stopping MCP server '{name}'")
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()

# Global instance
mcp_wrapper = CloudRunMCPWrapper()