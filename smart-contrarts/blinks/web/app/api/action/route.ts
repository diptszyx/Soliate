import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS } from "@solana/actions"
import { clusterApiUrl, Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import idl from "../../idl.json"
import { Metaplex } from "@metaplex-foundation/js";

async function getNFTDetails(mintAddress: string) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const metaplex = new Metaplex(connection);

  try {
    const nftDetails = await metaplex
      .nfts()
      .findByMint({ mintAddress: new PublicKey(mintAddress) });
    return nftDetails;
  } catch (error) {
    console.error("Error fetching NFT details:", error);
    throw error;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mintAddress = url.searchParams.get('mintAddress');

  if (!mintAddress) {
    return Response.json({ error: "Missing mintAddress parameter" }, { status: 400 });
  }

  try {
    const nftDetails = await getNFTDetails(mintAddress);

    const responseBody: ActionGetResponse = {
      icon: nftDetails.json?.image || "",
      description: nftDetails.json?.description || "",
      title: nftDetails.name || "NFT Action",
      label: "Claim Reward",
    }

    return Response.json(responseBody, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error in GET request:", error);
    return Response.json({ error: "Failed to fetch NFT details" }, { status: 500 });
  }
}

// export async function POST(request: Request) {
//   const requestBody: ActionPostRequest = await request.json();
//   const userPubkey = requestBody.account;
//   console.log(userPubkey);
//   const url = new URL(request.url)
//   // const param = url.searchParams.get('param');
//   // const user = new PublicKey(userPubkey);
//   const connection = new Connection(clusterApiUrl("devnet"));
//   // const ix = SystemProgram.transfer({
//   //   fromPubkey: user,
//   //   toPubkey: new PublicKey('HHm5DYCHMVcCnrdVDwJ1TVz5bHFmT3csEfSA7fGLwZVv'),
//   //   lamports: 1000000000,
//   // })
//   let name = userPubkey
//   const tx = new Transaction();
//   // if (action == "another") {
//   //   tx.add(ix)
//   // } else if (action == "nickname") {
//   //   name = param!
//   // }
//   tx.feePayer = new PublicKey(userPubkey);

//   const bh = (await connection.getLatestBlockhash({ commitment: "finalized" })).blockhash;
//   console.log("using blockhash " + bh)
//   tx.recentBlockhash = bh;
//   const serialTX = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
//   const response: ActionPostResponse = {
//     transaction: serialTX,
//     message: "hello " + name
//   };
//   return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
// }

export async function POST(request: Request) {
  const requestBody: ActionPostRequest = await request.json();
  const userPubkey = requestBody.account;
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  if (!wallet) return
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey("9xjZwkGTG2xkVbxequat9xhocAyXeSxRw3fo3MF4ENmL");
  const program = new anchor.Program(idl as anchor.Idl, "9xjZwkGTG2xkVbxequat9xhocAyXeSxRw3fo3MF4ENmL");

  const tx = new Transaction();


  const nftAddress = new PublicKey("địa_chỉ_NFT_của_bạn");
  const sharerAddress = new PublicKey("địa_chỉ_người_chia_sẻ");
  const interactorAddress = new PublicKey(userPubkey);
  const amountForSharer = 500000000; // 0.5 SOL
  const amountForInteractor = 500000000; // 0.5 SOL

  const [nftVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("nft_vault"), nftAddress.toBuffer()],
    programId
  );

  const withdrawIx = await program.methods
    .withdrawFromVault(new anchor.BN(amountForSharer), new anchor.BN(amountForInteractor))
    .accounts({
      nftVault: nftVaultPda,
      nft: nftAddress,
      sharer: sharerAddress,
      interactor: interactorAddress,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  tx.add(withdrawIx);

  tx.feePayer = new PublicKey(userPubkey);

  const bh = (await connection.getLatestBlockhash({ commitment: "finalized" })).blockhash;
  console.log("using blockhash " + bh)
  tx.recentBlockhash = bh;

  const serialTX = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
  const response: ActionPostResponse = {
    transaction: serialTX,
    message: "Transaction created for withdrawing from vault"
  };
  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
}


export async function OPTIONS(request: Request) {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS })
}