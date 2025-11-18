/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sb_coinflip.json`.
 */
export type SbCoinflip = {
  address: "9WZbqYGMxAfaybk5m56J6yuYUW1ryyguSvJEtA884t8o"
  metadata: {
    name: "sbCoinflip"
    version: "0.1.0"
    spec: "0.1.0"
    description: "Created with Anchor"
  }
  instructions: [
    {
      name: "closeAccount"
      discriminator: [125, 255, 149, 14, 110, 34, 72, 24]
      accounts: [
        {
          name: "signer"
          writable: true
          signer: true
        },
        {
          name: "playerStats"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [115, 116, 97, 116, 115]
              },
              {
                kind: "account"
                path: "signer"
              }
            ]
          }
        }
      ]
      args: []
    },
    {
      name: "coinFlip"
      discriminator: [229, 124, 31, 2, 166, 139, 34, 248]
      accounts: [
        {
          name: "user"
          writable: true
          signer: true
        },
        {
          name: "playerStats"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [115, 116, 97, 116, 115]
              },
              {
                kind: "account"
                path: "user"
              }
            ]
          }
        },
        {
          name: "escrow"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [101, 115, 99, 114, 111, 119, 95, 118, 97, 117, 108, 116]
              }
            ]
          }
        },
        {
          name: "randomnessAccountData"
        },
        {
          name: "systemProgram"
          address: "11111111111111111111111111111111"
        }
      ]
      args: [
        {
          name: "randomnessAccount"
          type: "pubkey"
        },
        {
          name: "wageredAmount"
          type: "u64"
        },
        {
          name: "currentGuess"
          type: "string"
        }
      ]
    },
    {
      name: "deposit"
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182]
      accounts: [
        {
          name: "signer"
          writable: true
          signer: true
        },
        {
          name: "playerStats"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [115, 116, 97, 116, 115]
              },
              {
                kind: "account"
                path: "signer"
              }
            ]
          }
        },
        {
          name: "systemProgram"
          address: "11111111111111111111111111111111"
        }
      ]
      args: [
        {
          name: "transferAmount"
          type: "u64"
        }
      ]
    },
    {
      name: "initialize"
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237]
      accounts: [
        {
          name: "signer"
          writable: true
          signer: true
        },
        {
          name: "playerStats"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [115, 116, 97, 116, 115]
              },
              {
                kind: "account"
                path: "signer"
              }
            ]
          }
        },
        {
          name: "systemProgram"
          address: "11111111111111111111111111111111"
        }
      ]
      args: [
        {
          name: "transferAmount"
          type: "u64"
        }
      ]
    },
    {
      name: "settleFlip"
      discriminator: [230, 135, 237, 220, 121, 217, 71, 131]
      accounts: [
        {
          name: "user"
          writable: true
          signer: true
        },
        {
          name: "playerStats"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [115, 116, 97, 116, 115]
              },
              {
                kind: "account"
                path: "user"
              }
            ]
          }
        },
        {
          name: "escrow"
          writable: true
          pda: {
            seeds: [
              {
                kind: "const"
                value: [101, 115, 99, 114, 111, 119, 95, 118, 97, 117, 108, 116]
              }
            ]
          }
        },
        {
          name: "randomnessAccountData"
        },
        {
          name: "systemProgram"
          address: "11111111111111111111111111111111"
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: "playerStats"
      discriminator: [169, 146, 242, 176, 102, 118, 231, 172]
    }
  ]
  errors: [
    {
      code: 6000
      name: "insufficientBalance"
      msg: "Transfer Failed due to insufficient funds "
    },
    {
      code: 6001
      name: "randomnessAlreadyRevealed"
      msg: "The finalized slot is not the latest slot "
    },
    {
      code: 6002
      name: "insufficientUserWagarBalance"
      msg: "Insufficient balance please tranfer lamports to your wager account"
    },
    {
      code: 6003
      name: "randomnessAccountMismatch"
      msg: "Randomness account provided does not match the randomness account stored"
    },
    {
      code: 6004
      name: "randomnessExpired"
      msg: "Randomness expired"
    },
    {
      code: 6005
      name: "randomnessNotResolved"
      msg: "Error : revealed random data unable to process "
    },
    {
      code: 6006
      name: "escrowFundError"
      msg: "Error: Not enough fund in the escrow / treasury vault"
    }
  ]
  types: [
    {
      name: "playerStats"
      type: {
        kind: "struct"
        fields: [
          {
            name: "allowedUser"
            type: "pubkey"
          },
          {
            name: "randomnessAccount"
            type: "pubkey"
          },
          {
            name: "randomGuessResult"
            type: "string"
          },
          {
            name: "currentGuess"
            type: "string"
          },
          {
            name: "wagerBalance"
            type: "u64"
          },
          {
            name: "wageredAmount"
            type: "u64"
          },
          {
            name: "bump"
            type: "u8"
          },
          {
            name: "commitSlot"
            type: "u64"
          }
        ]
      }
    }
  ]
}
