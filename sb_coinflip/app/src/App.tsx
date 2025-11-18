import { useState, useEffect, useMemo, useCallback } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import { Coins, TrendingUp, RefreshCw, Plus, AlertCircle } from "lucide-react"

import {
  getProgram,
  getPlayerStatsPDA,
  getEscrowPDA,
  solToLamports,
  lamportsToSol,
  LAMPORTS_PER_SOL,
} from "./utils/program"

export default function CoinflipDApp() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [balance, setBalance] = useState(0)
  const [wagerAmount, setWagerAmount] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [guess, setGuess] = useState<"Heads" | "Tails">("Heads")
  const [isFlipping, setIsFlipping] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [result, setResult] = useState<{
    outcome: string
    won: boolean
    amount: number
  } | null>(null)
  const [showDeposit, setShowDeposit] = useState(false)
  const [stats, setStats] = useState({ wins: 0, losses: 0, total: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingFlip, setPendingFlip] = useState<{
    randomnessAccount: PublicKey
    guess: string
    amount: number
  } | null>(null)

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null
    return getProgram(connection, wallet as any)
  }, [connection, wallet])

  // Fetch player stats
  const fetchPlayerStats = useCallback(async () => {
    if (!program || !wallet.publicKey) return

    try {
      const [playerStatsPDA] = getPlayerStatsPDA(wallet.publicKey)
      const account = await (program.account as any).playerStats.fetch(
        playerStatsPDA
      )

      setBalance(account.wagerBalance.toNumber())
      setIsInitialized(true)

      // Check if there's a pending flip
      if (
        account.randomnessAccount.toString() !== PublicKey.default.toString()
      ) {
        setPendingFlip({
          randomnessAccount: account.randomnessAccount,
          guess: account.currentGuess,
          amount: account.wageredAmount.toNumber(),
        })
      } else {
        setPendingFlip(null)
      }

      // Update stats from account (if stored)
      // For now, we'll keep local stats
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.log("Account not initialized:", error.message || "Unknown error")
      setIsInitialized(false)
      setBalance(0)
    }
  }, [program, wallet.publicKey])

  // Initialize player account
  const initializeAccount = async () => {
    if (!program || !wallet.publicKey) return

    setLoading(true)
    setError(null)

    try {
      const transferAmount = solToLamports(1) // 1 SOL
      const [playerStatsPDA] = getPlayerStatsPDA(wallet.publicKey)

      const tx = await program.methods
        .initialize(transferAmount)
        .accounts({
          signer: wallet.publicKey,
          playerStats: playerStatsPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      console.log("Initialize tx:", tx)
      await connection.confirmTransaction(tx, "confirmed")

      await fetchPlayerStats()
      alert("Account initialized with 1 SOL!")
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Initialize error:", error)
      setError(error.message || "Failed to initialize account")
    } finally {
      setLoading(false)
    }
  }

  // Handle deposit
  const handleDeposit = async () => {
    if (!program || !wallet.publicKey || !depositAmount) return

    setLoading(true)
    setError(null)

    try {
      const transferAmount = solToLamports(parseFloat(depositAmount))
      const [playerStatsPDA] = getPlayerStatsPDA(wallet.publicKey)

      const tx = await program.methods
        .deposit(transferAmount)
        .accounts({
          signer: wallet.publicKey,
          playerStats: playerStatsPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      console.log("Deposit tx:", tx)
      await connection.confirmTransaction(tx, "confirmed")

      await fetchPlayerStats()
      setDepositAmount("")
      setShowDeposit(false)
      alert(`Deposited ${depositAmount} SOL successfully!`)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Deposit error:", error)
      setError(error.message || "Failed to deposit")
    } finally {
      setLoading(false)
    }
  }

  const handleCoinFlip = async () => {
    if (!program || !wallet.publicKey || !wagerAmount) return

    setLoading(true)
    setError(null)
    setIsFlipping(true)
    setResult(null)

    try {
      // For now, we'll use a placeholder randomness account
      // In production, you need to create this via Switchboard
      const wageredAmount = solToLamports(parseFloat(wagerAmount))
      const [playerStatsPDA] = getPlayerStatsPDA(wallet.publicKey)
      const [escrowPDA] = getEscrowPDA()

      // TODO: Create actual Switchboard randomness account
      // For now, using a placeholder - this will fail in production
      // You need to integrate @switchboard-xyz/on-demand properly
      const randomnessAccount = PublicKey.default // Placeholder

      alert(
        "Note: Switchboard randomness integration needed. This is a placeholder implementation."
      )

      const tx = await program.methods
        .coinFlip(randomnessAccount, wageredAmount, guess)
        .accounts({
          user: wallet.publicKey,
          playerStats: playerStatsPDA,
          escrow: escrowPDA,
          randomnessAccountData: randomnessAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      console.log("Coin flip tx:", tx)
      await connection.confirmTransaction(tx, "confirmed")

      setPendingFlip({
        randomnessAccount,
        guess,
        amount: wageredAmount.toNumber(),
      })

      alert("Coin flip initiated! Now you need to settle it.")
      await fetchPlayerStats()
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Coin flip error:", error)
      setError(error.message || "Failed to initiate coin flip")
      setIsFlipping(false)
    } finally {
      setLoading(false)
    }
  }

  // Settle flip (reveal randomness)
  const handleSettleFlip = async () => {
    if (!program || !wallet.publicKey || !pendingFlip) return

    setLoading(true)
    setError(null)
    setIsSettling(true)

    try {
      const [playerStatsPDA] = getPlayerStatsPDA(wallet.publicKey)
      const [escrowPDA] = getEscrowPDA()

      // TODO: Reveal Switchboard randomness first
      // Then call settleFlip

      const tx = await program.methods
        .settleFlip()
        .accounts({
          user: wallet.publicKey,
          playerStats: playerStatsPDA,
          escrow: escrowPDA,
          randomnessAccountData: pendingFlip.randomnessAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      console.log("Settle flip tx:", tx)
      await connection.confirmTransaction(tx, "confirmed")

      // Fetch updated stats
      await fetchPlayerStats()

      // Determine result from account
      const account = await (program.account as any).playerStats.fetch(
        playerStatsPDA
      )
      const won = account.currentGuess === account.randomGuessResult

      setResult({
        outcome: account.randomGuessResult,
        won,
        amount: lamportsToSol(pendingFlip.amount),
      })

      if (won) {
        setStats((prev) => ({
          ...prev,
          wins: prev.wins + 1,
          total: prev.total + 1,
        }))
      } else {
        setStats((prev) => ({
          ...prev,
          losses: prev.losses + 1,
          total: prev.total + 1,
        }))
      }

      setPendingFlip(null)
      setIsFlipping(false)
      setIsSettling(false)
      setWagerAmount("")
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Settle flip error:", error)
      setError(error.message || "Failed to settle flip")
      setIsSettling(false)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats on wallet connect
  useEffect(() => {
    if (wallet.connected && program) {
      fetchPlayerStats()
    } else {
      setIsInitialized(false)
      setBalance(0)
      setPendingFlip(null)
    }
  }, [wallet.connected, program, fetchPlayerStats])

  const formatSol = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4)
  }

  const winRate =
    stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pt-4 md:pt-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full"></div>
              <Coins className="relative w-10 h-10 md:w-12 md:h-12 text-yellow-400 drop-shadow-lg" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg">
              Solana Coinflip
            </h1>
          </div>

          <WalletMultiButton />
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-400">Error</p>
              <p className="text-sm text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Initialize Account */}
        {wallet.connected && !isInitialized && (
          <div className="mb-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-6 backdrop-blur-sm shadow-lg">
            <p className="text-center text-lg mb-4">
              Welcome! Please initialize your account to start playing.
            </p>
            <div className="flex justify-center">
              <button
                onClick={initializeAccount}
                disabled={loading}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-xl font-bold hover:from-yellow-300 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/50 transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {loading ? "Initializing..." : "Initialize Account (1 SOL)"}
              </button>
            </div>
          </div>
        )}

        {/* Pending Flip Warning */}
        {pendingFlip && (
          <div className="mb-8 bg-orange-500/20 border-2 border-orange-500/50 rounded-xl p-6 backdrop-blur-sm shadow-lg">
            <p className="text-center text-lg mb-4">
              You have a pending flip! Settle it to see your result.
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleSettleFlip}
                disabled={loading || isSettling}
                className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-orange-300 hover:to-orange-400 transition-all shadow-lg shadow-orange-500/50 transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isSettling ? "Settling..." : "Settle Flip"}
              </button>
            </div>
          </div>
        )}

        {wallet.connected && isInitialized && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Stats Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20 shadow-2xl">
              <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                Your Stats
              </h2>

              <div className="space-y-5">
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-5 border border-yellow-500/30 shadow-lg">
                  <p className="text-sm text-gray-300 mb-1">Balance</p>
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    {formatSol(balance)} SOL
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30 shadow-md">
                    <p className="text-xs md:text-sm text-gray-300 mb-1">
                      Wins
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-green-400">
                      {stats.wins}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl p-4 border border-red-500/30 shadow-md">
                    <p className="text-xs md:text-sm text-gray-300 mb-1">
                      Losses
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-red-400">
                      {stats.losses}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-5 border border-blue-500/30 shadow-md">
                  <p className="text-sm text-gray-300 mb-1">Win Rate</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-400">
                    {winRate}%
                  </p>
                </div>

                <button
                  onClick={() => setShowDeposit(!showDeposit)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-4 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/50 transform hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Deposit SOL
                </button>

                {showDeposit && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount in SOL"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 transition-all"
                    />
                    <button
                      onClick={handleDeposit}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-green-500/50 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? "Depositing..." : "Confirm Deposit"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Game Panel */}
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 lg:p-10 border border-white/20 shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Flip the Coin!
              </h2>

              {/* Coin Display */}
              <div className="flex justify-center mb-10">
                <div className="relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-yellow-400/50 to-orange-500/50 rounded-full blur-2xl ${
                      isFlipping || isSettling ? "animate-pulse" : ""
                    }`}
                  ></div>
                  <div
                    className={`relative w-48 h-48 md:w-56 md:h-56 transition-transform duration-300 ${
                      isFlipping || isSettling
                        ? "animate-spin"
                        : "hover:scale-105"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20">
                      <span className="text-5xl md:text-6xl font-black text-white drop-shadow-2xl">
                        {isFlipping || isSettling
                          ? "?"
                          : result
                          ? result.outcome
                          : guess}
                      </span>
                    </div>
                    <div className="absolute inset-2 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {result && !isFlipping && !isSettling && (
                <div
                  className={`mb-8 p-6 rounded-2xl text-center border-2 shadow-2xl animate-in slide-in-from-top-4 duration-500 ${
                    result.won
                      ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400"
                      : "bg-gradient-to-r from-red-500/30 to-rose-500/30 border-red-400"
                  }`}
                >
                  <p className="text-3xl md:text-4xl font-black mb-3">
                    {result.won ? "🎉 You Won!" : "😔 You Lost"}
                  </p>
                  <p className="text-lg md:text-xl mb-2">
                    Result:{" "}
                    <span className="font-bold text-xl md:text-2xl">
                      {result.outcome}
                    </span>
                  </p>
                  <p
                    className={`text-xl md:text-2xl font-bold ${
                      result.won ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {result.won
                      ? `+${result.amount} SOL`
                      : `-${result.amount} SOL`}
                  </p>
                </div>
              )}

              {/* Game Controls */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm md:text-base font-bold mb-3 text-gray-300">
                    Your Guess
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setGuess("Heads")}
                      disabled={isFlipping || loading || !!pendingFlip}
                      className={`py-5 rounded-xl font-bold text-lg md:text-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        guess === "Heads"
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/50 border-2 border-yellow-300"
                          : "bg-white/10 hover:bg-white/20 border-2 border-white/20"
                      }`}
                    >
                      Heads
                    </button>
                    <button
                      onClick={() => setGuess("Tails")}
                      disabled={isFlipping || loading || !!pendingFlip}
                      className={`py-5 rounded-xl font-bold text-lg md:text-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        guess === "Tails"
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/50 border-2 border-yellow-300"
                          : "bg-white/10 hover:bg-white/20 border-2 border-white/20"
                      }`}
                    >
                      Tails
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm md:text-base font-bold mb-3 text-gray-300">
                    Wager Amount (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(e.target.value)}
                    disabled={isFlipping || loading || !!pendingFlip}
                    className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 text-white placeholder-gray-400 text-lg transition-all"
                  />
                  <div className="flex gap-3 mt-3">
                    {[0.1, 0.5, 1.0].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setWagerAmount(amount.toString())}
                        disabled={isFlipping || loading || !!pendingFlip}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm md:text-base font-semibold transition-all disabled:opacity-50 border border-white/20 hover:border-white/40 transform hover:scale-105 active:scale-95"
                      >
                        {amount} SOL
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCoinFlip}
                  disabled={
                    isFlipping ||
                    loading ||
                    !wallet.connected ||
                    balance === 0 ||
                    !!pendingFlip
                  }
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 via-pink-500 to-pink-600 hover:from-purple-600 hover:via-pink-600 hover:to-pink-700 px-6 py-5 rounded-xl font-black text-lg md:text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-purple-500/50 transform hover:scale-105 active:scale-95"
                >
                  {loading || isFlipping ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-6 h-6" />
                      <span>Flip Coin!</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Not Connected */}
        {!wallet.connected && (
          <div className="text-center py-20">
            <Coins className="w-24 h-24 mx-auto mb-6 text-purple-400" />
            <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-8">
              Connect your Solana wallet to start playing coinflip!
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-10 md:mt-12 text-center text-sm md:text-base text-gray-400 space-y-2">
          <p className="font-semibold">
            Powered by Switchboard Randomness • Fair & Verifiable
          </p>
        </div>
      </div>
    </div>
  )
}
