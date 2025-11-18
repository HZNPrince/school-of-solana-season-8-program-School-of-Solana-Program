import { Program, AnchorProvider, BN } from "@coral-xyz/anchor"
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js"
import idl from "../idl/sb_coinflip.json"
import type { SbCoinflip } from "../../types/sb_coinflip"

export const PROGRAM_ID = new PublicKey(
  "9WZbqYGMxAfaybk5m56J6yuYUW1ryyguSvJEtA884t8o"
)
export const LAMPORTS_PER_SOL = 1_000_000_000

export function getPlayerStatsPDA(
  userPublicKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stats"), userPublicKey.toBuffer()],
    PROGRAM_ID
  )
}

export function getEscrowPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow_vault")],
    PROGRAM_ID
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProgram(
  connection: Connection,
  wallet: any
): Program<SbCoinflip> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  })
  // Anchor 0.32: IDL already contains address, so we don't need to pass PROGRAM_ID separately
  return new Program(idl as any, provider)
}

export function solToLamports(sol: number): BN {
  return new BN(sol * LAMPORTS_PER_SOL)
}

export function lamportsToSol(lamports: number | BN): number {
  const num = typeof lamports === "number" ? lamports : lamports.toNumber()
  return num / LAMPORTS_PER_SOL
}
