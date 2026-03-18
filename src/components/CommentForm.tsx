import { useState } from "preact/hooks";
import { connectWallet, submitComment, type Comment } from "../lib/golos";
import type { Hex } from "viem";

type Props = {
  postSlug: string;
  onCommentPosted: (comment: Comment) => void;
};

export default function CommentForm({ postSlug, onCommentPosted }: Props) {
  const [address, setAddress] = useState<Hex | null>(null);
  const [username, setUsername] = useState(localStorage.getItem("golos:username") ?? "");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const u = username.trim();
    const c = content.trim();
    if (!u) { setStatus("Username is required"); return; }
    if (!c) { setStatus("Comment is required"); return; }

    setSubmitting(true);

    try {
      // Connect wallet if not yet connected
      let addr = address;
      if (!addr) {
        setStatus("Connecting wallet…");
        addr = await connectWallet();
        setAddress(addr);
      }

      setStatus("Signing…");
      await submitComment(postSlug, addr, u, c);
      localStorage.setItem("golos:username", u);
      setContent("");
      onCommentPosted({
        author: addr,
        username: u,
        ensName: "",
        content: c,
        timestamp: Math.floor(Date.now() / 1000),
      });
      setStatus("Comment posted!");
    } catch (e: any) {
      setStatus(`Error: ${e.message ?? "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  const shortAddr = address ? address.slice(0, 6) + "…" + address.slice(-4) : null;

  return (
    <div class="form-fields">
      <div class="form-row">
        <input
          type="text"
          placeholder="Username"
          maxLength={64}
          value={username}
          onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
        />
        {shortAddr && <span class="wallet-address">{shortAddr}</span>}
      </div>
      <textarea
        placeholder="Write a comment…"
        maxLength={5120}
        rows={4}
        value={content}
        onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
      />
      <div class="form-row">
        <button onClick={handleSubmit} disabled={submitting}>Post Comment</button>
        {status && <span class="form-status">{status}</span>}
      </div>
    </div>
  );
}
