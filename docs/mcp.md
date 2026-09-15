# Today MCP server

Today’s MCP server lets an AI assistant view and manage your todos. Connect the assistant to:

`https://today.harrismccullers.com/mcp`

## Sign-in

Connecting opens Today in your browser. Sign in with your email and password, review the requested access, and choose whether to allow it. You do not need to create or copy an API token, and the assistant can access only your todos.

Access expires after one hour. Reconnect and authorize the assistant again to continue; Today does
not issue long-lived refresh tokens.

## Tools

- **List todos:** View your todos, optionally filtered by date or completion status.
- **Create a todo:** Add a todo on a chosen date.
- **Set todo status:** Mark a todo as to do or done.
- **Reschedule a todo:** Move a todo to a chosen date. Today separately preserves whether it has
  ever been postponed.
- **Delete a todo:** Remove a todo from your list.
