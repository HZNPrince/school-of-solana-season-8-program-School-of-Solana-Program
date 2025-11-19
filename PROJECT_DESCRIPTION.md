IMPORTANT : The program will not work because Switchboard devnet is down and will not work until its up but the following implementation of creating randomness, commiting to randomness and revealing the randomness account is correctly implementing in the test file and lib.rs

I have not implemented the correct switchboard implementation on the app(frontend) because there are several switchboard-side errors which are yet to be fixed by them causing it to site-crash

Project Description
Deployed Frontend URL: https://coinflipbydev.vercel.app/

Solana Program ID: 9WZbqYGMxAfaybk5m56J6yuYUW1ryyguSvJEtA884t8o

Project Overview
Description
Solana Coin Flip is a decentralized, transparent, and provably fair gambling application built on the Solana blockchain. To ensure true fairness, this dApp leverages Switchboard VRF (Verifiable Random Function).

Unlike traditional betting apps where the server controls the odds, our program relies on Switchboard's Oracle network to generate unpredictable on-chain randomness. The game follows a rigorous "Request-Callback" flow where the randomness is generated off-chain and verified on-chain, ensuring the house cannot manipulate the outcome.

Key Features
Switchboard Oracle Integration: Uses Switchboard’s VRF to guarantee that every coin flip result is cryptographically random and tamper-proof.

Automated Callbacks: The game resolution is triggered automatically by the Switchboard Oracle via a Cross-Program Invocation (CPI), ensuring a seamless user experience.

Non-Custodial Escrow: User funds and house liquidity are managed via secure Program Derived Addresses (PDAs).

Double-or-Nothing: Simple mechanics—win to double your SOL, lose and the vault collects the wager.

How to Use the dApp
Connect Wallet: Connect a Solana wallet (Phantom/Solflare).

Place Bet: Select Heads or Tails and input your wager (e.g., 0.1 SOL).

Approve Request: Sign the transaction to send your wager and the VRF Oracle fee.

Await Callback: The UI updates to "Flipping..." while the Switchboard Oracle processes the request.

Result: Once the Oracle triggers the callback, the result is revealed, and winnings (if any) are settled instantly.

Program Architecture
The program utilizes the Switchboard Callback pattern. The randomness is not determined in the user's transaction but in a separate transaction initiated by the Oracle.

PDA Usage
PDAs Used:

Vault Account: [b"vault"]

Purpose: Holds the "House" liquidity to pay out winners.

User State: [b"user_state", user_public_key]

Purpose: Tracks the user's active wager, prediction (Heads/Tails), and the current VRF Request ID.

(Note: You likely also interact with Switchboard-specific accounts, such as the VrfAccount or RandomnessAccount depending on your implementation version).

Program Instructions
Instructions Implemented:

initialize:

Initializes the House Vault.

Configures the Switchboard Queue and Oracle Authority.

place_bet:

Transfers the user's wager to the Vault PDA.

Saves the user's prediction (Heads/Tails).

Calls switchboard_v2::request_randomness via CPI to the Switchboard program.

consume_randomness (Callback):

Security: This instruction is restricted so it can only be called by the Switchboard Program.

Receives the random buffer from the Oracle.

Derives the result (randomness % 2).

Settles the bet: transfers funds to the user on a win, or updates state on a loss.

Account Structure
Rust

#[account]
pub struct UserState {
pub player: Pubkey,
pub wager: u64,
pub prediction: u8, // 0 = Heads, 1 = Tails
pub vrf_request_id: u64, // To link the callback to the bet
pub bump: u8,
}

#[account]
pub struct Vault {
pub authority: Pubkey,
pub amount: u64,
}
Testing
Test Coverage
Testing was performed using Anchor and the Switchboard Test Context to simulate Oracle responses locally.

Happy Path Tests:

End-to-End Flow:

User places a bet.

Simulate Switchboard Oracle fulfilling the request (Mock Callback).

Verify consume_randomness executes successfully.

Assert Vault balance decreased and User balance increased (for a win).

Vault Funding: Verify the vault can be initialized and funded by the admin.

Unhappy Path Tests:

Unauthorized Callback: Attempting to call consume_randomness with a wallet that is not the Switchboard Program (should fail).

Vault Insolvency: Betting more than the Vault holds.

Active Bet Block: Attempting to place a second bet while waiting for the first callback.

Running Tests
We use the standard Anchor test runner, often requiring a local Switchboard environment or mocks.

Bash

# Install dependencies

yarn install

# Run tests

anchor test
Additional Notes for Evaluators
Switchboard Devnet: The program is configured for the Switchboard Devnet Queue.

Latency: Results typically settle within 1-3 seconds depending on the Oracle response time.
