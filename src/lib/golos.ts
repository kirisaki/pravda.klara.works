import { createPublicClient, http, keccak256, toHex, encodePacked, type Hex } from "viem";
import { base } from "viem/chains";

const CONTRACT_ADDRESS = "0x4Dbfdd81D982c2F7b1fD844D49b93483b5c0900D" as Hex;
const RPC_URL = "https://mainnet.base.org";
const RELAYER_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8787"
    : "https://relayer.kristina3731.workers.dev";
const DEPLOY_BLOCK = 43523515n;
const CHUNK_SIZE = 5000n;

const golosAbi = [
  {
    type: "event" as const,
    name: "CommentPosted" as const,
    inputs: [
      { name: "commentId", type: "uint256" as const, indexed: true },
      { name: "postId", type: "bytes32" as const, indexed: true },
      { name: "author", type: "address" as const, indexed: true },
      { name: "username", type: "string" as const, indexed: false },
      { name: "ensName", type: "string" as const, indexed: false },
      { name: "content", type: "string" as const, indexed: false },
      { name: "timestamp", type: "uint256" as const, indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function" as const,
    name: "isSpam" as const,
    inputs: [{ name: "commentId", type: "uint256" as const }],
    outputs: [{ name: "", type: "bool" as const }],
    stateMutability: "view" as const,
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

export type Comment = {
  commentId: number;
  author: string;
  username: string;
  ensName: string;
  content: string;
  timestamp: number;
};

export function slugToPostId(postSlug: string): Hex {
  return keccak256(toHex(postSlug));
}

export async function fetchComments(postSlug: string): Promise<Comment[]> {
  const postId = slugToPostId(postSlug);
  const latest = await publicClient.getBlockNumber();
  let from = DEPLOY_BLOCK;
  const logs = [];

  while (from <= latest) {
    const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;
    const chunk = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESS,
      abi: golosAbi,
      eventName: "CommentPosted",
      args: { postId },
      fromBlock: from,
      toBlock: to,
    });
    logs.push(...chunk);
    from = to + 1n;
  }

  const comments = logs.map((log) => ({
    commentId: Number(log.args.commentId!),
    author: log.args.author!,
    username: log.args.username!,
    ensName: log.args.ensName!,
    content: log.args.content!,
    timestamp: Number(log.args.timestamp!),
  }));

  // Filter out spam comments
  const spamChecks = await Promise.all(
    comments.map((c) =>
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: golosAbi,
        functionName: "isSpam",
        args: [BigInt(c.commentId)],
      }),
    ),
  );

  return comments.filter((_, i) => !spamChecks[i]);
}

// --- Social auth session ---

export type SocialSession = {
  token: string;
  displayName: string;
  wallet: string;
};

export function getSocialSession(): SocialSession | null {
  const token = localStorage.getItem("golos:token");
  const displayName = localStorage.getItem("golos:displayName");
  const wallet = localStorage.getItem("golos:wallet");
  if (!token || !displayName || !wallet) return null;
  return { token, displayName, wallet };
}

export function saveSocialSession(session: SocialSession) {
  localStorage.setItem("golos:token", session.token);
  localStorage.setItem("golos:displayName", session.displayName);
  localStorage.setItem("golos:wallet", session.wallet);
}

export function clearSocialSession() {
  localStorage.removeItem("golos:token");
  localStorage.removeItem("golos:displayName");
  localStorage.removeItem("golos:wallet");
}

export function getGoogleAuthUrl(): string {
  return `${RELAYER_URL}/auth/google`;
}

export async function submitSocialComment(
  postSlug: string,
  username: string,
  content: string,
  token: string,
): Promise<{ txHash: string }> {
  const res = await fetch(`${RELAYER_URL}/comment/social`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ postSlug, username, content }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

// --- Wallet connection ---

export async function connectWallet(): Promise<Hex> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("Please install a wallet (e.g. MetaMask)");
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0] as Hex;
}

export async function submitComment(
  postSlug: string,
  author: Hex,
  username: string,
  content: string,
): Promise<{ txHash: string; ensName?: string }> {
  const postId = slugToPostId(postSlug);
  const ethereum = (window as any).ethereum;

  const messageHash = keccak256(
    encodePacked(
      ["address", "bytes32", "string", "string"],
      [author, postId, username, content],
    ),
  );

  const signature = await ethereum.request({
    method: "personal_sign",
    params: [messageHash, author],
  });

  const res = await fetch(`${RELAYER_URL}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, postSlug, username, content, signature }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
