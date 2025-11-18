import * as anchor from "@coral-xyz/anchor"
import * as sb from "@switchboard-xyz/on-demand"
import { sleep } from "@switchboard-xyz/common"
import { Program, Idl } from "@coral-xyz/anchor"
import { SbCoinflip } from "../target/types/sb_coinflip"
import { assert } from "chai"

describe("coinflip test cases", () => {
  // --- 1. Setup Provider, Wallet, and Program ---
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const wallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.SbCoinflip as Program<SbCoinflip>

  // --- 2. Switchboard Setup ---
  let switchboardProgram: Program<Idl>
  const sbQueue = sb.ON_DEMAND_DEVNET_QUEUE
  const sbProgramId = sb.ON_DEMAND_DEVNET_PID

  // --- 3. PDAs (we'll define them here for reuse) ---
  const [playerStatsPDA, playerBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stats"), wallet.publicKey.toBuffer()],
      program.programId
    )

  const [escrowVault, escrowbump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_vault")],
      program.programId
    )

  // --- 4. Before Hook (Load Switchboard) ---
  before("load switchboard program", async () => {
    const switchboardIdl = await anchor.Program.fetchIdl(sbProgramId, provider)
    switchboardProgram = new anchor.Program(switchboardIdl, provider)

    console.log("Setup complete. Running tests on Devnet.")
    console.log("Your wallet:", wallet.publicKey.toString())
    console.log("Your program:", program.programId.toString())
    console.log("Player PDA:", playerStatsPDA.toString())
  })

  //                   Test cases                  //
  it("initializes the player account", async () => {
    const depositAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL)

    try {
      const txSignature = await program.methods
        .initialize(depositAmount)
        .accounts({
          signer: wallet.publicKey,
        })
        .rpc()

      console.log(`Initialize transaction complete ${txSignature}`)

      const accountData = await program.account.playerStats.fetch(
        playerStatsPDA
      )
      assert.equal(
        accountData.wagerBalance.toString(),
        depositAmount.toString(),
        "Wager Balance Mismatch"
      )
      assert.ok(
        accountData.allowedUser.equals(wallet.publicKey),
        "Allowed user mismatch"
      )
    } catch (error) {
      console.error("Initializes test failed : ", error)
    }
  })

  it("Performs a full coin flip (Heads)", async () => {
    const guess = "Heads"
    const wagerAmount = new anchor.BN(0.05 * anchor.web3.LAMPORTS_PER_SOL)

    // Randomness
    const rngKp = anchor.web3.Keypair.generate()
    const [randomness, createIx] = await sb.Randomness.create(
      switchboardProgram as any,
      rngKp,
      sbQueue
    )

    await provider.sendAndConfirm(new anchor.web3.Transaction().add(createIx), [
      rngKp,
    ]),
      console.log("Randomness account created : ", rngKp.publicKey.toString())

    // Step 2: Commit randomness in SEPARATE transaction
    const commitIx = await randomness.commitIx(sbQueue)
    const commitTx = new anchor.web3.Transaction().add(commitIx)
    const commitSig = await provider.sendAndConfirm(commitTx)
    console.log("Commit Tx : ", commitSig)

    // Step 3: Wait for commitment to finalize
    console.log("Waiting for commitment to finalize...")
    await sleep(2000) // Wait 2 seconds for the slot to advance

    // Step 4: Now call coin_flip
    const coinflipIx = await program.methods
      .coinFlip(randomness.pubkey, wagerAmount, guess)
      .accounts({
        randomnessAccountData: randomness.pubkey,
      })
      .instruction()

    const flipTx = new anchor.web3.Transaction().add(coinflipIx)
    const flipSig = await provider.sendAndConfirm(flipTx)
    console.log("Coinflip Tx : ", flipSig)

    console.log("Waiting 10 seconds for Oracle reveal...")
    await sleep(10000)

    const revealIx = await randomness.revealIx()

    const settleFlipIx = await program.methods
      .settleFlip()
      .accounts({
        randomnessAccountData: randomness.pubkey,
      })
      .instruction()

    const revealTx = new anchor.web3.Transaction()
      .add(revealIx)
      .add(settleFlipIx)
    const revealSig = await provider.sendAndConfirm(revealTx)
    console.log("Reveal + Settle Tx: ", revealSig)

    const accountData = await program.account.playerStats.fetch(playerStatsPDA)
    console.log("Player Guess: ", guess)
    console.log("Final result: ", accountData.randomGuessResult)

    if (accountData.randomGuessResult == guess) {
      console.log("🎉 Player WON!")
    } else {
      console.log("😭 Player LOST!")
    }

    // Check that the state was reset
    assert.equal(accountData.wageredAmount.toString(), "0")
    assert.equal(accountData.currentGuess, "")
    assert.ok(
      accountData.randomnessAccount.equals(anchor.web3.PublicKey.default)
    )
  })

  after("Close the player_stats account", async () => {
    try {
      const txSignature = await program.methods
        .closeAccount() // <-- This is your new Rust function
        .accounts({
          signer: wallet.publicKey,
        })
        .rpc()
      console.log("Player account closed successfully.", txSignature)
    } catch (error) {
      if (error.toString().includes("Account does not exist")) {
        console.log("Player account already closed or was never created.")
      } else {
        console.error("Failed to close player account:", error)
      }
    }
  })
})
