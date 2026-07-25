import type { Metadata } from "next";
import GiscusEmbed from "@/components/Giscus";
import { site } from "@/site.config";

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Join the community discussion — episode chat, questions for the hosts, and episode requests.",
};

export default function ForumPage() {
  const hosts = site.hosts.map((host) => host.name).join(" & ");

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Forum
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        This is the community corner of the show. Talk about the latest
        episode, ask {hosts} a question, or pitch a topic for a future one.
        Sign in with a GitHub account to join the conversation.
      </p>

      <div className="mt-8">
        <GiscusEmbed />
      </div>
    </div>
  );
}
