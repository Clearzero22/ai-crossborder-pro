# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-05-19

### Added
- Project urgent issues tracking document

## [1.0.0] - 2026-05-19

**Milestone: Development mode and packaged Windows client both fully functional.**

67 commits since project initialization. All core features work in both `npm run dev` and packaged EXE on other machines.

### Added — Core Platform
- Monorepo workspace setup (frontend + backend + electron)
- Electron desktop shell with production backend process management
- Bundled standalone Node.js runtime for backend (ABI-safe native modules)
- Auto-update system via GitHub Releases (electron-updater)
- NSIS installer for Windows, DMG for macOS, AppImage/DEB for Linux

### Added — Workflow Engine
- Visual workflow editor with drag-and-drop node canvas
- Sequential node execution engine with DataBus for inter-node data passing
- Pipeline Data Viewer page with step-aware field renderers
- Run-store for persistent step I/O data

### Added — Browser Automation & Crawlers
- GigaB2B product crawler (title, price, description, images, specs)
- Amazon keyword search → ASIN list extraction
- Amazon product detail scraper
- Xiyouzhaoci keyword mining (search volume, difficulty, traffic share)
- Configurable browser settings with CDN-based Playwright Chromium download
- Browser data profile management (multi-profile support)
- Anti-detection browser launch modes (stealth, persistent context)

### Added — AI Integration
- Multi AI Provider architecture (Qwen / OpenAI / Claude / Gemini)
- AI vision service for product image recognition (8 templates)
- Gemini browser automation (file upload + text chat)
- ChatGPT browser automation (file upload)
- AI-powered Listing optimization with keyword injection

### Added — Data Pipeline
- Three-layer ETL architecture (Raw → Staging → Clean)
- Dual database driver support (SQLite + PostgreSQL)
- SQLite data export script
- Database stats, runs, products API endpoints

### Fixed
- Resolve browser settings API HTTP 500 (DB lifecycle — ensureBrowserDb singleton)
- Resolve Chrome `exitCode=21` on other machines (use `executablePath` instead of `channel`)
- Resolve `Cannot find package 'playwright-core'` in packaged app (static imports + module.paths injection)
- Resolve white screen in packaged build (correct frontend-dist bundling)
- Resolve AI vision keyword extraction and Amazon search timeout issues
- Resolve DASHSCOPE_API_KEY missing in production build
- Resolve Electron build path resolution and missing hoisted dependencies
- Resolve PG trendSql parameter mismatch
- Show actual error messages when crawler/search nodes fail (was "完成: 未知")
- Add retry logic for file lock errors in build scripts
- Replace electron-store with simple JSON config

### Changed
- Replace `playwright` with `playwright-core` across all services (avoids browser download)
- Obfuscate backend code with esbuild, disable Electron sourceMap
- Frontend error handling to surface backend failures to users
