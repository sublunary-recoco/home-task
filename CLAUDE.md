# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"煮理人" is a WeChat Mini Program for family kitchen management — task assignment with scoring, recipe management, and fridge inventory tracking. It uses WeChat Cloud (云开发) for backend, so there is no traditional server.

## Development Environment

This project requires **WeChat Developer Tools** for local development, preview, and debugging. There is no npm build pipeline or test runner at the project root.

- Open the project root in WeChat Developer Tools using AppID `wxe5004372672f61e1`
- Cloud environment ID is configured in `miniprogram/app.js` (`wx.cloud.init`)
- Hot reload and URL check are disabled in `project.private.config.json` for dev convenience

## Deploying Cloud Functions

Each cloud function lives in `cloudfunctions/<name>/` with its own `package.json` (dependency: `wx-server-sdk ~2.6.3`).

Deploy a single function via WeChat Developer Tools CLI:
```
${installPath} cloud functions deploy --e ${envId} --n <functionName> --r --project ${projectPath}
```

Or right-click the function folder in WeChat Developer Tools → "上传并部署：云端安装依赖".

## Architecture

### Frontend (`miniprogram/`)

- `app.js` — Global state: `userInfo`, `openId`, `familyId`. Initializes cloud on launch and redirects unauthenticated users to login.
- `pages/` — 10 pages; each page folder contains `.js`, `.wxml`, `.wxss`, `.json`.
- `components/cloudTipModal/` — Reusable modal for cloud-related prompts.

All cloud function calls follow this pattern:
```js
wx.cloud.callFunction({ name: 'functionName', data: { action: 'actionName', ...params } })
```

### Backend (`cloudfunctions/`)

Six cloud functions, each handling one domain via an `action` dispatch pattern:

| Function | Actions | Collections |
|---|---|---|
| `getOpenId` | (implicit) | `users` |
| `familyManager` | create, join, get, leave | `families` |
| `taskManager` | create, list, myList, take, submit, review, cancel, delete | `tasks` |
| `fridgeManager` | list, add, update, remove, cook, cookingLogs | `fridge_items`, `cooking_logs` |
| `recipeManager` | create, update, delete, detail, list | `recipes` |
| `scoreManager` | list, myLogs | `score_logs` |

All cloud functions return `{ success: boolean, data?: any, message?: string }`.

### Database Collections

- `users` — openId, nickName, avatarUrl, familyId, score, level
- `families` — name, inviteCode, members[], createdBy
- `tasks` — familyId, title, status (`pending→doing→review→done/cancel`), assigneeId, rewardScore, deadline
- `recipes` — familyId, name, ingredients[], steps[], difficulty, cookTime, tags
- `fridge_items` — familyId, name, quantity, unit, category, expiryDate
- `score_logs` — userId, familyId, score, type, remark
- `cooking_logs` — familyId, recipeId, consumedIngredients[], warnings[]

### Key Data Flows

1. **Auth**: Login page → `getOpenId` cloud function → stores openId + userInfo in `app.globalData` and `wx.setStorageSync`
2. **Task lifecycle**: create (pending) → member takes it (doing) → member submits (review) → creator approves (done, score awarded) or rejects
3. **Cooking**: select recipe → `fridgeManager/cook` deducts ingredients from `fridge_items`, logs to `cooking_logs`, warns on insufficient stock
4. **Scoring**: `taskManager/review` writes to `score_logs` and increments `users.score`

## WeChat-Specific Notes

- `wx.getUserProfile()` requires a user gesture (button tap) to trigger — cannot be called on page load.
- Cloud database permissions are set per-collection in the WeChat Cloud console; backend functions run with admin privileges.
- `wx.setStorageSync` / `wx.getStorageSync` are used for session persistence across page navigations.
- The tab bar is defined in `miniprogram/app.json` with 4 tabs: home, task, fridge, mine.
