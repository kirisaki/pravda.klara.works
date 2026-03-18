import type { Comment } from "../lib/golos";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 16).replace("T", " ");
}

function shortAddress(addr: string): string {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function CommentList({ comments, loading }: { comments: Comment[]; loading: boolean }) {
  if (loading) return <p class="comment-status">Loading comments…</p>;
  if (comments.length === 0) return <p class="comment-status">No comments yet.</p>;

  return (
    <div>
      {comments.map((c, i) => (
        <div class="comment" key={i}>
          <div class="comment-header">
            <span class="comment-author-line">
              <span class="comment-author">{c.username}</span>
              {c.ensName && <span class="author-ens">{c.ensName}</span>}
              <span class="author-addr">{shortAddress(c.author)}</span>
            </span>
            <span class="comment-date">{formatDate(c.timestamp)}</span>
          </div>
          <div class="comment-body">{c.content}</div>
        </div>
      ))}
    </div>
  );
}
