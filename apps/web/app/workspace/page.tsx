import { WorkspaceTerminal } from "@/components/workspace-terminal";

export const metadata = { title: "Research workspace" };

export default function WorkspacePage() {
  return (
    <main className="shell main-content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Research workspace</p>
          <h1>Keep your thesis organized.</h1>
          <p>
            Organize watchlists, saved screens, and notes. Start without an
            account.
          </p>
        </div>
      </section>
      <WorkspaceTerminal />
    </main>
  );
}
