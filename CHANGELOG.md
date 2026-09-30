# Changelog

## 2.1.9 - 2026-09-30

- Show sudo-save success in the status bar for three seconds instead of a persistent notification.
- Finish sudo-save progress after verified writeback without waiting for temporary cleanup; read saved login passwords independently of SSH key selection.
- Avoid repeated identical SFTP directory-permission notifications during automatic/save-triggered tree refreshes; explicit refresh and reconnect can notify again.
- Offer sudo save only after an SSH remote editor save fails with a write-permission error; authorization and passwords apply only to that file's current save.
- Confirm the remote is Linux and reuse the target connection's saved login password when sudo authentication is required, with a manual password fallback.
- Save through sudo cp with a private temporary directory, original-file backup, content verification and recovery on confirmed write failures.

## 2.1.8 - 2026-09-30

- Added recursive deletion of non-empty SFTP/FTP directories with explicit confirmation and symlink protection.
- Improved remote error details with failing paths, server error codes and a details dialog.

## 2.1.7 - 2026-09-30

- Fixed stale configuration updates, SSH/FTP connection lifecycle and transfer cancellation.
- Improved configuration cleanup, credential persistence, terminal safety and SOCKS shutdown.
- Reduced background writes and added runtime regression tests to release CI.

## 2.1.6 - 2026-06-09

- Fixed a bug where background status refresh could overwrite edited connection data such as the selected group.

## 2.1.4 - 2026-05-20

- Changed the extension identity to `charley008.sshtools2` so it no longer conflicts with the Marketplace version.
- Renamed contributed commands and views to the `sshtools2.*` namespace for safer side-by-side installation.
- Updated VSIX packaging to use the package name in `packages/sshtools2-*.vsix`.
- Fixed WebView action allow-list entries for connection tests and management buttons.
- Fixed SSH/FTP online status probing and workspace add guard handling.

## 2.1.3 - 2026-05-12

- Added SSH HostKey fingerprint recording and change warning.
- Added WebView message allow-list checks and CSP hardening.
- Added safer path/name validation for SSH and FTP file operations.

## 2.1.2 - 2026-05-12

- Moved saved SSH credentials into VS Code SecretStorage.
- Moved saved FTP passwords into VS Code SecretStorage.
- Changed config export/import to password-protected file-based backup only.
- Removed clipboard host-info copy and pasted JSON import paths that could expose sensitive data.
- Refined the config management page layout.

## 2.1.1 - 2026-05-12

- Added safe config export: normal `.db` / `.json` exports now omit passwords, private keys, and passphrases.
- Added secure config export for `.db` / `.json` using a user-provided export password.
- Added secure config import support while keeping compatibility with older `.db` exports.
- Moved packaged VSIX output into `packages/` and kept generated packages out of the repository root.
- Limited GitHub Actions packaging to version tags and manual runs.
- Cleaned up low-risk legacy comments and added small shared utility wrappers for future security work.

## 2.1.0 - 2026-05-11

- Added single-hop SSH jump host support for SSH/SFTP/terminal connections.
- Added SSH add/edit controls for enabling a jump host and selecting an existing SSH connection.
- Kept FTP, RDP, VNC, and port-forwarding behavior unchanged.
- Added validation for missing jump host, self-jump, and nested jump host configurations.

## 2.0.2 - 2026-05-11

- Hardened SSH port forwarding command execution by avoiding shell string concatenation and removing `sshpass -p` password exposure.
- Reduced Linux RDP password exposure by passing the FreeRDP password through stdin instead of the process command line.
- Fixed stale SSH/FTP connection cache reuse when a connection is no longer marked online.
- Added safer SSH/FTP connection cleanup guards to avoid duplicate reject/cleanup paths.
- Removed the duplicate temp-file cleanup implementation and kept the open-document aware version.
- Replaced weak persistent ID generation with `crypto.randomUUID()` or a crypto random fallback.
- Preserved imported remote desktop IDs instead of always overwriting them.
- Replaced array `for...in` loops in upload flows with item iteration.
- Removed the global `unhandledRejection` hook so unrelated extension errors are no longer swallowed.
- Changed activation from wildcard activation to command/view based activation events.
