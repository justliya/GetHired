#!/bin/bash

# Start the first process (Firebase MCP)
MCP_TRANSPORT=http MCP_HTTP_PORT=8000 npx @gannonh/firebase-mcp 

# Start the second process (ADK web server)
adk web --port=8000 --host=0.0.0.0 

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?