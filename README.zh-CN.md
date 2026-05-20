# Close Code

[English](README.md)

Close Code 是一个基于 Claude Code 改造的个人代码 CLI，用来配合我自己的开发工作流。
它提供一个交互式终端 Agent，可以读取和编辑文件、运行 shell 命令、理解项目说明，并在本地仓库里协助完成开发任务。

这个项目保留了 Claude Code 风格的命令行体验，同时把包名、命令名、构建流程和本地使用方式调整为 Close Code。

## 功能

- 交互式终端代码助手
- 面向项目的文件编辑和命令执行
- 继承 Claude Code 风格的斜杠命令工作流
- 支持 MCP 相关集成和本地配置
- 可通过内置模型流程配置 OpenAI 兼容模型或提供商
- 基于 Node.js、TypeScript 和 esbuild 的本地构建流程

## 环境要求

- 推荐使用 Node.js 20 或更新版本
- npm
- 可用的模型提供商账号或 API Key

当前 `package.json` 里允许 Node.js 18+，但部分依赖使用了较新的 ESM 语法，在 Node.js 20+ 上运行更稳。

## 从源码安装

克隆仓库并安装依赖：

```bash
git clone https://github.com/Hex4C59/close-code.git
cd close-code
npm install
```

构建 CLI：

```bash
npm run build
```

直接运行：

```bash
npm start
```

也可以把本地包链接到全局，让 `close` 命令可用：

```bash
npm link
close
```

## 从 npm 安装

如果包已经发布到 npm，可以全局安装：

```bash
npm install -g close-code
close
```

## 认证与模型配置

启动 CLI，并按交互提示完成登录或模型提供商配置：

```bash
close
```

进入交互式会话后，可以使用内置模型命令选择或配置模型提供商：

```text
/model
```

如果使用 Anthropic 兼容方式，也可以在启动前通过环境变量提供凭据：

```bash
export ANTHROPIC_API_KEY="your-api-key"
close
```

## 常用命令

```bash
close --version
close
npm run build
npm run check
```

## 项目结构

```text
src/          主要 TypeScript 源码
scripts/      构建和源码准备脚本
stubs/        构建过程中使用的兼容性存根
dist/         构建后的 CLI 输出
```

## 说明

Close Code 是一个个人改造和研究性质的代码库，并不是 Anthropic 官方项目。
在敏感仓库中使用前，请先审查代码、配置和模型提供商设置。
