import { createPublicClient, http, keccak256, toHex, encodePacked, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

const CONTRACT_ADDRESS = "0x694790a0A09b60103C616003B8404b141557F4DA" as Hex;
const RPC_URL = "https://sepolia.base.org";
const RELAYER_URL = "https://relayer.kristina3731.workers.dev";
const DEPLOY_BLOCK = 38990704n;
const CHUNK_SIZE = 5000n;

const golosAbi = [
  {
    type: "event" as const,
    name: "CommentPosted" as const,
    inputs: [
      { name: "postId", type: "bytes32" as const, indexed: true },
      { name: "author", type: "address" as const, indexed: true },
      { name: "username", type: "string" as const, indexed: false },
      { name: "ensName", type: "string" as const, indexed: false },
      { name: "content", type: "string" as const, indexed: false },
      { name: "timestamp", type: "uint256" as const, indexed: false },
    ],
    anonymous: false,
  },
] as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

export type Comment = {
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

  return logs.map((log) => ({
    author: log.args.author!,
    username: log.args.username!,
    ensName: log.args.ensName!,
    content: log.args.content!,
    timestamp: Number(log.args.timestamp!),
  }));
}

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
