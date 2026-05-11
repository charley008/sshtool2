# Changelog

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
