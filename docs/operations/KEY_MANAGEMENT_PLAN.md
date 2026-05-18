# Key Management and Recovery Plan

This document defines minimum operational controls for privileged VFIDE keys.

## Scope

Privileged keys include:

- deployer EOAs
- owner keys for core contracts
- AdminMultiSig signer keys
- guardian/operator keys
- JWT signing secrets
- webhook secrets
- Redis credentials
- block-explorer verification API keys

## Required Controls

1. Production owner privileges must not remain on a single EOA once the system is live.
2. Core ownership must move to AdminMultiSig or timelocked governance as soon as deployment validation completes.
3. No seed phrase or private key may be stored in the repo, CI logs, or plain-text shared docs.
4. Secrets must be stored in the deployment platform secret manager.
5. Every privileged key needs an identified backup custodian and recovery path.

## Minimum Production Topology

- 1 deployment signer for initial rollout only
- 1 AdminMultiSig controlling long-lived ownership
- 2+ backup signers held by separate operators
- 1 break-glass emergency operator with documented scope

## Rotation Triggers

Rotate immediately when:

- any key is exposed or suspected exposed
- a maintainer leaves the project
- a signing device is lost
- unexplained admin activity is detected
- a third-party secret (webhook, Redis, JWT) appears in logs or client code

## Rotation Procedure

1. Identify all systems using the secret.
2. Provision a replacement secret or signer.
3. Update environment configuration.
4. Transfer on-chain privileges if applicable.
5. Validate application and contract functionality.
6. Revoke the old credential.
7. Record evidence and timestamp.

## Recovery Records

Maintain an offline record containing:

- owner of each key
- storage method (hardware wallet, vault, secret manager)
- backup custodian
- last rotation date
- recovery instructions

Do not store private keys in this document.
