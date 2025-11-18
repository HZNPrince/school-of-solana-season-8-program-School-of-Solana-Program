import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js"
import { Randomness } from "@switchboard-xyz/on-demand"

// Devnet Switchboard queue
const SB_QUEUE_DEVNET = new PublicKey(
  "2ie3JZfKcvsRLsJaP5fSo43gUo1vsurnUAtAg8M3NiBV"
)

export async function createRandomnessAccount(
  connection: Connection,
  payer: Keypair
): Promise<{ randomness: Randomness; createIx: any }> {
  const rngKp = Keypair.generate()
  const switchboardProgram = new PublicKey(
    "SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f"
  )

  const randomness = new Randomness(rngKp.publicKey, connection)
  const createIx = await randomness.createIx(
    switchboardProgram,
    SB_QUEUE_DEVNET
  )

  return { randomness, createIx }
}

export async function commitRandomness(
  randomness: Randomness,
  connection: Connection
): Promise<Transaction> {
  const commitIx = await randomness.commitIx(SB_QUEUE_DEVNET)
  return new Transaction().add(commitIx)
}

export async function revealRandomness(randomness: Randomness): Promise<any> {
  return await randomness.revealIx()
}
