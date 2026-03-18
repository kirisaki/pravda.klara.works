import { useState, useEffect } from "preact/hooks";
import {
  connectWallet,
  submitComment,
  submitSocialComment,
  getSocialSession,
  clearSocialSession,
  getGoogleAuthUrl,
  type Comment,
  type SocialSession,
} from "../lib/golos";
import type { Hex } from "viem";

type Props = {
  postSlug: string;
  onCommentPosted: (comment: Comment) => void;
};

export default function CommentForm({ postSlug, onCommentPosted }: Props) {
  const [walletAddress, setWalletAddress] = useState<Hex | null>(null);
  const [socialSession, setSocialSession] = useState<SocialSession | null>(null);
  const [username, setUsername] = useState(localStorage.getItem("golos:username") ?? "");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getSocialSession();
    if (session) setSocialSession(session);
  }, []);

  const isAuthenticated = !!socialSession || !!walletAddress;

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      setWalletAddress(addr);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }

  function handleGoogleLogin() {
    localStorage.setItem("golos:returnTo", window.location.href);
    window.location.href = getGoogleAuthUrl();
  }

  function handleLogout() {
    clearSocialSession();
    setSocialSession(null);
    setWalletAddress(null);
    setStatus("");
  }

  async function handleSubmit() {
    const u = username.trim();
    const c = content.trim();
    if (!u) { setStatus("Username is required"); return; }
    if (!c) { setStatus("Comment is required"); return; }

    setSubmitting(true);

    try {
      if (socialSession) {
        setStatus("Submitting…");
        await submitSocialComment(postSlug, u, c, socialSession.token);
      } else if (walletAddress) {
        setStatus("Signing…");
        await submitComment(postSlug, walletAddress, u, c);
      }

      localStorage.setItem("golos:username", u);
      setContent("");
      onCommentPosted({
        commentId: -1,
        author: socialSession?.wallet ?? walletAddress!,
        username: u,
        ensName: "",
        content: c,
        timestamp: Math.floor(Date.now() / 1000),
      });
      setStatus("Comment posted!");
    } catch (e: any) {
      if (e.message?.includes("expired") || e.message?.includes("Invalid")) {
        clearSocialSession();
        setSocialSession(null);
        setStatus("Session expired. Please log in again.");
      } else {
        setStatus(`Error: ${e.message ?? "Unknown error"}`);
      }
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

  const shortAddr = walletAddress
    ? walletAddress.slice(0, 6) + "…" + walletAddress.slice(-4)
    : null;

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
        {socialSession && (
          <span class="social-info">Logged in as {socialSession.displayName}</span>
        )}
        {shortAddr && <span class="wallet-address">{shortAddr}</span>}
        {isAuthenticated && (
          <button class="btn-link" onClick={handleLogout}>Logout</button>
        )}
      </div>
      <textarea
        placeholder="Write a comment…"
        maxLength={5120}
        rows={4}
        value={content}
        onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
      />
      <div class="form-actions">
        {!isAuthenticated && (
          <div class="auth-buttons">
            <button class="btn-secondary" onClick={handleConnect}>Connect Wallet</button>
            <span class="auth-or">or</span>
            <button class="btn-secondary" onClick={handleGoogleLogin}>Sign in with Google</button>
          </div>
        )}
        <button
          class="btn-submit"
          onClick={handleSubmit}
          disabled={submitting || !isAuthenticated}
        >
          Post Comment
        </button>
      </div>
      {status && <span class="form-status">{status}</span>}
    </div>
  );
}
