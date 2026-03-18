import { useState, useEffect } from "preact/hooks";
import { fetchComments, type Comment } from "../lib/golos";
import CommentList from "./CommentList";
import CommentForm from "./CommentForm";

export default function Comments({ postSlug }: { postSlug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments(postSlug)
      .then(setComments)
      .catch((e) => console.error("Failed to load comments:", e))
      .finally(() => setLoading(false));
  }, [postSlug]);

  function handleCommentPosted(comment: Comment) {
    setComments((prev) => [...prev, comment]);
  }

  return (
    <section class="comments">
      <h2>Comments</h2>
      <div class="comment-list">
        <CommentList comments={comments} loading={loading} />
      </div>
      <div class="comment-form">
        <CommentForm postSlug={postSlug} onCommentPosted={handleCommentPosted} />
        <p class="comment-notice">
          Comments are stored semi-permanently on the blockchain.<br />
          コメントは半永久的にブロックチェーンへ保存されます。
        </p>
      </div>
    </section>
  );
}
