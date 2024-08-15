const express = require("express");
const { ACTIONS_CORS_HEADERS } = require("@solana/actions");
const {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} = require("@solana/web3.js");
const { Program, web3 } = require("@coral-xyz/anchor");
const { Metaplex } = require("@metaplex-foundation/js");
const BN = require("bn.js");
const idl = require("./idl.json");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Middleware để thêm CORS headers
app.use((req, res, next) => {
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// Hàm lấy chi tiết NFT
async function getNFTDetails(mintAddress) {
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

// Route GET và POST cho /api/action
app
  .route("/api/action")
  .get(async (req, res) => {
    const mintAddress = req.query.mintAddress;

    if (!mintAddress) {
      return res.status(400).json({ error: "Missing mintAddress parameter" });
    }

    try {
      const nftDetails = await getNFTDetails(mintAddress);

      const responseBody = {
        icon: nftDetails.json?.image || "",
        description: nftDetails.json?.description || "",
        title: nftDetails.name || "NFT Action",
        label: "Claim Reward",
      };

      res.json(responseBody);
    } catch (error) {
      console.error("Error in GET request:", error);
      res.status(500).json({ error: "Failed to fetch NFT details" });
    }
  })
  .post(async (req, res) => {
    const { mintAddress, sharerAddress, amountForSharer, amountForInteractor } =
      req.query;
    const userPubkey = req.body.account;

    if (
      !mintAddress ||
      !sharerAddress ||
      !amountForSharer ||
      !amountForInteractor
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Chuyển đổi địa chỉ thành chuỗi để đảm bảo so sánh nhất quán
    const sharerAddressString = new PublicKey(sharerAddress).toString();
    const userPubkeyString = new PublicKey(userPubkey).toString();

    // Kiểm tra xem user có phải là sharer không
    if (userPubkeyString === sharerAddressString) {
      return res.status(400).json({
        error: "Invalid wallet address",
        message:
          "The sharer's wallet address is not eligible to claim the reward. Please use a different wallet.",
      });
    }

    const connection = new Connection(clusterApiUrl("devnet"));
    const programId = new PublicKey(idl.address);
    const program = new Program(idl, programId);

    const nftAddress = new PublicKey(mintAddress);
    const sharerAddressPubkey = new PublicKey(sharerAddress);
    const interactorAddress = new PublicKey(userPubkey);

    const [nftVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft_vault"), nftAddress.toBuffer()],
      programId
    );

    try {
      const accountInfo = await connection.getAccountInfo(nftVaultPda);

      if (!accountInfo) {
        return res
          .status(400)
          .json({ error: "NFT Vault account does not exist" });
      }

      const decodedAccountInfo = program.coder.accounts.decode(
        "nftVault",
        accountInfo.data
      );

      if (
        decodedAccountInfo.interacted.some((addr) =>
          addr.equals(interactorAddress)
        )
      ) {
        return res.status(400).json({
          error: "Already claimed",
          message:
            "You have already claimed the reward for this NFT. Each wallet can only claim once.",
        });
      }

      // If not claimed, proceed with creating the transaction
      const tx = new Transaction();

      const withdrawIx = await program.methods
        .withdrawFromVault(new BN(amountForSharer), new BN(amountForInteractor))
        .accounts({
          nftVault: nftVaultPda,
          nft: nftAddress,
          sharer: sharerAddressPubkey,
          interactor: interactorAddress,
          systemProgram: web3.SystemProgram.programId,
        })
        .instruction();
      tx.add(withdrawIx);
      tx.feePayer = new PublicKey(userPubkey);

      const bh = (
        await connection.getLatestBlockhash({ commitment: "finalized" })
      ).blockhash;
      console.log("using blockhash " + bh);
      tx.recentBlockhash = bh;

      const serialTX = tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");
      const response = {
        transaction: serialTX,
        message: "Transaction created for withdrawing from vault",
      };
      res.json(response);
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      res.status(500).json({
        error: "Failed to process withdrawal",
        message: error.message,
      });
    }
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
