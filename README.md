# Close Code

[中文](README.zh-CN.md)

Close Code is a personal coding CLI refactored from Claude Code for my own workflow.
It provides an interactive terminal agent that can read and edit files, run shell
commands, use project instructions, and work inside a local repository.

This project keeps the Claude Code-style command line experience, while adapting
the package name, binary name, build pipeline, and local workflow details for
Close Code.

## Features

- Interactive terminal coding assistant
- Project-aware file editing and command execution
- Slash-command based workflow inherited from Claude Code
- MCP-related integrations and local configuration support
- OpenAI-compatible model/provider configuration through the in-app model flow
- Local build pipeline based on Node.js, TypeScript, and esbuild

## Requirements

- Node.js 20 or newer is recommended
- npm
- A supported model provider account or API key

The package metadata currently allows Node.js 18+, but some dependencies use
newer ESM syntax that is more reliable on Node.js 20+.

## Install From Source

Clone the repository and install dependencies:

```bash
git clone https://github.com/Hex4C59/close-code.git
cd close-code
npm install
```

Build the CLI:

```bash
npm run build
```

Run it directly:

```bash
npm start
```

Or link the local package so the `close` command is available globally:

```bash
npm link
close
```

## Install From npm

If the package has been published to npm, install it globally:

```bash
npm install -g close-code
close
```

## Authentication

Start the CLI and follow the login or provider setup flow:

```bash
close
```

Inside the interactive session, use the built-in model/provider command to select
or configure a model provider when needed:

```text
/model
```

For Anthropic-compatible usage, you can also provide credentials through your
environment before starting the CLI:

```bash
export ANTHROPIC_API_KEY="your-api-key"
close
```

## Common Commands

```bash
close --version
close
npm run build
npm run check
```

## Project Layout

```text
src/          Main TypeScript source tree
scripts/      Build and source preparation scripts
stubs/        Compatibility stubs used by the build
dist/         Built CLI output
```

## Notes

Close Code is a personal refactor and research-oriented codebase. It is not an
official Anthropic project. Review the code, configuration, and provider settings
before using it in sensitive repositories.
