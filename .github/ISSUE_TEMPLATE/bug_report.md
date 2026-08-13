---
name: Bug report
description: Report a problem with the plugin
title: "[Bug]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        If this is a security vulnerability, do NOT report it here — see [SECURITY.md](../../SECURITY.md).
  - type: textarea
    id: description
    attributes:
      label: Bug description
      description: What happened?
      placeholder: A clear and concise description of the bug
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: How can we reproduce it?
      placeholder: |
        1. Install the plugin in tui.json
        2. Run opencode with a provider that has balance
        3. See the panel go stale / an error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What did you expect to happen?
      placeholder: The balance panel should update after each request
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
      description: What actually happened?
      placeholder: The panel shows a stale balance or crashes
    validations:
      required: true
  - type: input
    id: opencode-version
    attributes:
      label: opencode version
      description: Output of `opencode --version`
      placeholder: e.g. 1.20.0
    validations:
      required: true
  - type: input
    id: runtime
    attributes:
      label: Node / Bun version
      description: Output of `node --version` or `bun --version`
      placeholder: e.g. bun 1.1.30, node v22.12.0
  - type: dropdown
    id: os
    attributes:
      label: OS
      description: What operating system are you on?
      options:
        - macOS
        - Linux
        - Windows
        - Other
  - type: textarea
    id: config
    attributes:
      label: Config
      description: Sanitized tui.json snippet — remove any API keys or secrets
      placeholder: |
        {
          "plugin": ["@bitio/opencode-provider-balance"]
        }
      render: json
  - type: textarea
    id: logs
    attributes:
      label: Logs
      description: Relevant logs or error output
      placeholder: Paste any relevant logs here
      render: shell
---
