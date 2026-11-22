import type { Metadata } from "next";
import McpCopyBox from "@/components/McpCopyBox";

const ENDPOINT = "https://preparingforai.net/api/mcp";
const GUIDE_URL = "https://preparingforai.net/mcp";

const QUICK_START_PROMPT = `Read ${GUIDE_URL} and set up the Preparing for AI MCP server for me. I am using [NAME YOUR AI CLIENT]. Configure the public remote Streamable HTTP MCP server at ${ENDPOINT} for that client, using the exact instructions and config snippets on the page. It is read-only and requires no API key. After configuring it, test the connection by calling list_episodes and show me a few results. Then start helping me research and prep the next Preparing for AI episode! If you cannot change my client settings yourself, give me the exact steps and configuration to paste.`;

const REMOTE_CONFIG = `{
  "mcpServers": {
    "preparingforai": {
      "type": "http",
      "url": "${ENDPOINT}"
    }
  }
}`;

const MCP_REMOTE_CONFIG = `{
  "mcpServers": {
    "preparingforai": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${ENDPOINT}"
      ]
    }
  }
}`;

const CLAUDE_CODE_COMMAND = `claude mcp add --transport http preparingforai ${ENDPOINT}`;

const TOOL_GUIDES = [
  {
    name: "search_transcripts",
    description: "Find exact moments across speaker-labeled transcripts, summaries, and talking points.",
    signature: `{
  query: string,                 // required
  speaker?: string,
  season?: number,
  format?: "debate" | "deep-dive" | "guest" | "special",
  era?: "peak" | "early" | "recent",
  limit?: number                 // default 10, max 30
}`,
    result: "Structured excerpts with episode URLs and [MM:SS] timestamps.",
  },
  {
    name: "get_episode",
    description: "Open one episode by its slug or Buzzsprout ID for deep research.",
    signature: `{
  id_or_slug: string,            // required
  include_transcript?: boolean,  // default false
  speaker?: string,
  chapter_index?: number
}`,
    result: "Metadata, summary, talking points, Jimmy and Matt’s stances, chapters, predictions, and optional transcript.",
  },
  {
    name: "list_episodes",
    description: "Browse the newest-first catalog and filter for a season, format, or era.",
    signature: `{
  season?: number,
  format?: "debate" | "deep-dive" | "guest" | "special",
  era?: "peak" | "early" | "recent",
  limit?: number                 // default 25, max 100
}`,
    result: "Slugs, titles, dates, durations, formats, eras, summaries, and episode URLs.",
  },
  {
    name: "search_predictions",
    description: "Audit past calls by topic, host, category, or outcome, with optional live market odds.",
    signature: `{
  query?: string,
  host?: string,
  category?: "dated" | "open-ended",
  status?: "correct" | "incorrect" | "partial" | "pending" | "unresolved",
  include_polymarket?: boolean,  // default true
  limit?: number                 // default 25, max 100
}`,
    result: "Prediction claims, quotes, outcomes, source episodes, timestamps, and optional Polymarket odds.",
  },
  {
    name: "get_host_profile",
    description: "Understand how Jimmy or Matt thinks and how each host’s views have evolved.",
    signature: `{
  host: "Jimmy" | "Matt"         // required
}`,
    result: "Worldview, recurring themes, peak-era highlights, voice patterns, evolution notes, and prediction scorecard.",
  },
];

const MACHINE_SPEC = JSON.stringify(
  {
    name: "preparingforai-mcp",
    version: "1.0.0",
    endpoint: ENDPOINT,
    documentation: GUIDE_URL,
    transport: "Streamable HTTP",
    protocolVersion: "2025-03-26",
    authentication: "none",
    access: "public read-only",
    initialize: {
      method: "initialize",
      expectedProtocolVersion: "2025-03-26",
    },
    clients: {
      claudeCode: CLAUDE_CODE_COMMAND,
      claudeDesktopOrClaudeAi: {
        remoteConnectorUrl: ENDPOINT,
        mcpRemoteFallback: JSON.parse(MCP_REMOTE_CONFIG),
      },
      cursorAntigravityWindsurf: JSON.parse(REMOTE_CONFIG),
      chatGptCustomConnector: {
        url: ENDPOINT,
        authentication: "No Authentication",
      },
    },
    tools: TOOL_GUIDES.map(({ name, description, signature }) => ({
      name,
      description,
      arguments: signature,
    })),
    testCall: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "list_episodes",
        arguments: { limit: 5 },
      },
    },
  },
  null,
  2,
);

const RESEARCH_PROMPTS = [
  "Check what Jimmy and Matt previously said about China AI models and list our past predictions with timestamps. Separate what each host said, link every transcript moment, and flag predictions that are still unresolved.",
  "Find episodes where Jimmy and Matt disagree about AI and work. Summarize each host’s stance, quote the strongest transcript moments with [MM:SS] timestamps, and suggest a follow-up debate question.",
  "Review Matt’s prediction scorecard and compare it with Jimmy’s. Show correct, incorrect, partial, pending, and unresolved calls, then pick three past predictions we should revisit on the next episode.",
  "Help me prep the next Preparing for AI episode about AI companions. Search our transcripts and host profiles for relevant past takes, build a balanced research outline, and include three episode callbacks with URLs and timestamps.",
];

export const metadata: Metadata = {
  title: "MCP Server Setup Guide",
  description: `Connect any MCP-compatible AI to the Preparing for AI catalog through the public read-only server at ${ENDPOINT}. Setup for Claude, ChatGPT, Cursor, Antigravity, Windsurf, and more.`,
};

function SectionHeading({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="mb-7 flex items-start gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-sm font-bold text-accent">
        {number}
      </span>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">{detail}</p>
      </div>
    </div>
  );
}

export default function McpSetupGuide() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative border-b border-border/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Public MCP server · Read-only
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Put the whole podcast inside <span className="text-accent">your AI.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Matt—and every listener—can connect Claude, ChatGPT, Cursor, or Antigravity directly
              to all 74+ Preparing for AI episodes, full transcripts, Jimmy and Matt’s stances, and
              the predictions ledger. No copying archives into a chat. No API key. Just one public,
              read-only Streamable HTTP endpoint.
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <McpCopyBox label="Your public MCP endpoint" value={ENDPOINT} language="streamable http" />
            <div className="grid grid-cols-3 gap-3 text-center lg:w-80">
              {[
                ["74+", "Episodes"],
                ["5", "AI tools"],
                ["0", "API keys"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-border bg-surface/70 px-3 py-4">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <section aria-labelledby="easiest-setup">
          <div id="easiest-setup" className="scroll-mt-8">
            <SectionHeading
              number="1"
              title="Easiest Way: Just Paste This Into Your AI (for Matt!)"
              detail="You do not need to understand JSON or MCP. Paste this one prompt into the AI client you want to connect; it can read this guide, choose the right config, test the server, and begin episode prep."
            />
          </div>
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-4 sm:p-6">
            <McpCopyBox
              label="The one prompt to rule the setup"
              value={QUICK_START_PROMPT}
              language="ready-to-paste prompt"
            />
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white">Machine-readable setup specification</h3>
            <p className="mb-4 mt-2 max-w-3xl text-sm leading-6 text-muted">
              This visible specification gives an LLM the transport, protocol, client configs, tool
              signatures, and a concrete test call. Tell any AI: “Read {GUIDE_URL} and set up the
              Preparing for AI MCP server for me.”
            </p>
            <McpCopyBox
              label="Complete MCP server specification for LLMs"
              value={MACHINE_SPEC}
              language="json"
            />
          </div>
        </section>

        <section aria-labelledby="client-setup">
          <div id="client-setup" className="scroll-mt-8">
            <SectionHeading
              number="2"
              title="Client-Specific Setup Configs"
              detail="Prefer to configure it yourself? Use the remote URL directly when your client supports Streamable HTTP, or copy the exact snippet for your app. Authentication is always none."
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Remote connector</p>
              <h3 className="mt-2 text-xl font-bold text-white">Claude Desktop / Claude.ai Connectors</h3>
              <ol className="mb-5 mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
                <li>Open the connector or MCP server settings in Claude.</li>
                <li>Add a remote server using this URL; leave authentication off.</li>
                <li>If your desktop version only accepts local commands, use the mcp-remote fallback.</li>
              </ol>
              <div className="space-y-4">
                <McpCopyBox label="Remote MCP URL" value={ENDPOINT} language="url" />
                <McpCopyBox label="Claude mcp-remote fallback config" value={MCP_REMOTE_CONFIG} language="json" />
              </div>
            </article>

            <article className="flex flex-col rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">One terminal command</p>
              <h3 className="mt-2 text-xl font-bold text-white">Claude Code CLI</h3>
              <p className="mb-5 mt-4 text-sm leading-6 text-slate-300">
                Run this command, restart Claude Code if needed, then ask it to call list_episodes.
                The explicit HTTP transport selects the public Streamable HTTP endpoint.
              </p>
              <McpCopyBox label="Claude Code setup command" value={CLAUDE_CODE_COMMAND} language="shell" />
              <div className="mt-5 rounded-xl border border-border/70 bg-slate-950/40 p-4 text-sm leading-6 text-muted">
                Server name: <code className="text-slate-200">preparingforai</code>
                <br />Authentication: <code className="text-slate-200">none</code>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Shared JSON config</p>
              <h3 className="mt-2 text-xl font-bold text-white">Cursor / Antigravity / Windsurf</h3>
              <p className="mb-5 mt-4 text-sm leading-6 text-slate-300">
                Open your client’s MCP settings JSON and merge this mcpServers entry. Keep any
                existing servers, save, then reload the MCP configuration.
              </p>
              <McpCopyBox label="Cursor, Antigravity, and Windsurf config" value={REMOTE_CONFIG} language="json" />
            </article>

            <article className="flex flex-col rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Custom connector</p>
              <h3 className="mt-2 text-xl font-bold text-white">ChatGPT Custom Connectors / MCP</h3>
              <ol className="mb-5 mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
                <li>Open ChatGPT’s connector or MCP settings for your plan.</li>
                <li>Create a custom connector with the URL below.</li>
                <li>Select “No Authentication,” save, and enable the connector in a chat.</li>
              </ol>
              <McpCopyBox
                label="ChatGPT custom connector settings"
                value={`MCP server URL: ${ENDPOINT}\nAuthentication: No Authentication`}
                language="settings"
              />
              <p className="mt-4 text-xs leading-5 text-muted">
                Custom connector availability depends on your ChatGPT plan and workspace settings.
              </p>
            </article>
          </div>
        </section>

        <section aria-labelledby="tools-and-prompts">
          <div id="tools-and-prompts" className="scroll-mt-8">
            <SectionHeading
              number="3"
              title="Available Tools & Example Research Prompts"
              detail="Once connected, your AI can search the catalog itself. These are read-only research tools: they cannot edit episodes, publish content, or change predictions."
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {TOOL_GUIDES.map((tool) => (
              <article key={tool.name} className="rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
                <h3 className="break-words font-mono text-lg font-bold text-accent">{tool.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{tool.description}</p>
                <pre className="mt-4 overflow-x-auto rounded-xl border border-border/70 bg-slate-950/70 p-4 font-mono text-xs leading-5 text-slate-300">
                  <code>{tool.signature}</code>
                </pre>
                <p className="mt-4 text-xs leading-5 text-muted"><strong className="text-slate-300">Returns:</strong> {tool.result}</p>
              </article>
            ))}
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold text-white">Research prompts for Matt &amp; Jimmy</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Copy any of these into your connected client, or use them as a starting point for your own episode prep.
            </p>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {RESEARCH_PROMPTS.map((prompt, index) => (
                <McpCopyBox
                  key={prompt}
                  label={`Research prompt ${index + 1}`}
                  value={prompt}
                  language="copyable example"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center sm:p-8">
          <h2 className="text-2xl font-bold text-white">Ready for the first test?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Ask your connected AI: “Use list_episodes to show the five newest Preparing for AI episodes,
            then search_transcripts for our most recent discussion about AI agents.”
          </p>
          <code className="mt-5 inline-block max-w-full break-all rounded-lg border border-accent/30 bg-slate-950/70 px-4 py-3 text-sm text-accent">
            {ENDPOINT}
          </code>
        </section>
      </div>
    </main>
  );
}
