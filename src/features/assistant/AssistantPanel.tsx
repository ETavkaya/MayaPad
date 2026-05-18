import { Send } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { cn } from '../../components/ui/cn'
import { useLaunchBrainStore } from '../../store/useLaunchBrainStore'

const QUICK_ACTIONS = ['Auto Group', 'Suggest Layout', 'Tune Vocal', 'Build Scene', 'Clean Up Grid']

export function AssistantPanel() {
  const assistantMessages = useLaunchBrainStore((state) => state.assistantMessages)
  const assistantInput = useLaunchBrainStore((state) => state.assistantInput)
  const setAssistantInput = useLaunchBrainStore((state) => state.setAssistantInput)
  const submitAssistantPrompt = useLaunchBrainStore((state) => state.submitAssistantPrompt)
  const runAssistantQuickAction = useLaunchBrainStore((state) => state.runAssistantQuickAction)

  return (
    <Panel title="AI Assistant" className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-800 px-3 py-2 text-[11px] text-slate-400">
          Local preview mode: AI actions coming soon, local helpers are active.
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {assistantMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'max-w-[95%] rounded-lg border px-2.5 py-2 text-xs leading-relaxed',
                message.role === 'assistant'
                  ? 'border-slate-700 bg-slate-900 text-slate-200'
                  : 'ml-auto border-sky-500/30 bg-sky-500/15 text-sky-100',
              )}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 p-3">
          <div className="grid grid-cols-1 gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                type="button"
                key={action}
                onClick={() => runAssistantQuickAction(action)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 focus-within:border-sky-500">
            <input
              type="text"
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitAssistantPrompt()
                }
              }}
              placeholder="Ask anything..."
              className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={submitAssistantPrompt}
              className="rounded-md border border-slate-600 p-1 text-slate-300 transition hover:border-slate-400 hover:text-white"
              aria-label="Send prompt"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Panel>
  )
}

