// components/JobHeader.tsx
import { Sparkles } from "lucide-react";

interface JobHeaderProps {
  user: {
    isAnonymous: boolean;
    email?: string;
    uid?: string;
  } | null;
  agentJobsCount: number;
  showChatBot: boolean;
  onToggleChat: () => void;
  onNewChat: () => void;
  onToggleAgentJobs: () => void;
  onSave: () => void;
  useAgentJobs: boolean;
}

export default function JobHeader({
  user,
  agentJobsCount,
  showChatBot,
  onToggleChat,
  onNewChat,
  onToggleAgentJobs,
  onSave,
  useAgentJobs,
}: JobHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Job Listings {useAgentJobs && agentJobsCount > 0 && "(AI Results)"}
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {user && (
            <span className="text-sm">
              • User: {user.isAnonymous ? "Anonymous" : user.email || user.uid?.slice(0, 8)}
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
        <button
          onClick={onToggleChat}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {showChatBot ? "Hide Assistant" : "Job Assistant"}
        </button>

        {showChatBot && (
          <button
            onClick={onNewChat}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            🧹 New Chat
          </button>
        )}

        {agentJobsCount > 0 && (
          <button
            onClick={onToggleAgentJobs}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            {useAgentJobs ? "Show Saved Jobs" : `Show New Job Listings (${agentJobsCount})`}
          </button>
        )}

        <button
          onClick={onSave}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
        >
          💾 Save
        </button>
      </div>
    </div>
  );
}