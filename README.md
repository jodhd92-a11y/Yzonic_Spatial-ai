# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
pnpm dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
pnpm exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
pnpm exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
pnpm exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
pnpm exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)

```
web-os
├─ .husky
│  ├─ _
│  │  ├─ applypatch-msg
│  │  ├─ commit-msg
│  │  ├─ h
│  │  ├─ husky.sh
│  │  ├─ post-applypatch
│  │  ├─ post-checkout
│  │  ├─ post-commit
│  │  ├─ post-merge
│  │  ├─ post-rewrite
│  │  ├─ pre-applypatch
│  │  ├─ pre-auto-gc
│  │  ├─ pre-commit
│  │  ├─ pre-merge-commit
│  │  ├─ pre-push
│  │  ├─ pre-rebase
│  │  └─ prepare-commit-msg
│  └─ pre-commit
├─ .npmrc
├─ README.md
├─ apps
│  ├─ chat
│  │  ├─ README.md
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ postcss.config.js
│  │  ├─ public
│  │  │  └─ favicon.svg
│  │  ├─ src
│  │  │  ├─ App.vue
│  │  │  ├─ components
│  │  │  │  ├─ chat
│  │  │  │  │  ├─ MarkdownRenderer.vue
│  │  │  │  │  ├─ MessageBubble.vue
│  │  │  │  │  ├─ MessageList.vue
│  │  │  │  │  └─ TypingIndicator.vue
│  │  │  │  ├─ common
│  │  │  │  │  ├─ AnnouncementBillboard.vue
│  │  │  │  │  ├─ DoodleLogo.vue
│  │  │  │  │  ├─ IconButton.vue
│  │  │  │  │  ├─ LogoBadge.vue
│  │  │  │  │  ├─ LogoMark.vue
│  │  │  │  │  ├─ OnboardingTour.vue
│  │  │  │  │  ├─ SettingsModal.vue
│  │  │  │  │  ├─ ShortcutsModal.vue
│  │  │  │  │  ├─ SkeletonBlock.vue
│  │  │  │  │  ├─ ThemeSwitcher.vue
│  │  │  │  │  └─ TooltipHost.vue
│  │  │  │  ├─ composer
│  │  │  │  │  ├─ Composer.vue
│  │  │  │  │  ├─ MicRecorder.vue
│  │  │  │  │  └─ ModelPicker.vue
│  │  │  │  └─ sidebar
│  │  │  │     ├─ ConversationItem.vue
│  │  │  │     ├─ ConversationSidebar.vue
│  │  │  │     ├─ ProfileMenu.vue
│  │  │  │     └─ SidebarBody.vue
│  │  │  ├─ composables
│  │  │  │  ├─ useAutoResizeTextarea.ts
│  │  │  │  ├─ useBridge.ts
│  │  │  │  ├─ useComposerMobileSheet.ts
│  │  │  │  ├─ useDoodle.ts
│  │  │  │  ├─ useSSEChat.ts
│  │  │  │  └─ useShortcuts.ts
│  │  │  ├─ i18n
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ locales
│  │  │  │  │  ├─ en.ts
│  │  │  │  │  ├─ es.ts
│  │  │  │  │  ├─ fr.ts
│  │  │  │  │  ├─ hi.ts
│  │  │  │  │  └─ zh.ts
│  │  │  │  └─ messageSchema.ts
│  │  │  ├─ lib
│  │  │  │  ├─ doodleEvents.ts
│  │  │  │  ├─ markdown.ts
│  │  │  │  ├─ mockResponder.ts
│  │  │  │  ├─ tooltipDirective.ts
│  │  │  │  └─ utils.ts
│  │  │  ├─ main.ts
│  │  │  ├─ router
│  │  │  │  └─ index.ts
│  │  │  ├─ stores
│  │  │  │  ├─ chat.ts
│  │  │  │  ├─ settings.ts
│  │  │  │  ├─ theme.ts
│  │  │  │  ├─ tooltip.ts
│  │  │  │  ├─ ui.ts
│  │  │  │  └─ user.ts
│  │  │  ├─ styles
│  │  │  │  ├─ globals.css
│  │  │  │  └─ tokens.css
│  │  │  ├─ types
│  │  │  │  └─ chat.ts
│  │  │  ├─ views
│  │  │  │  └─ ChatView.vue
│  │  │  └─ vite-env.d.ts
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.node.json
│  │  └─ vite.config.ts
│  ├─ explorer
│  │  ├─ AGENTS.md
│  │  ├─ CLAUDE.md
│  │  ├─ README.md
│  │  ├─ components.json
│  │  ├─ eslint.config.mjs
│  │  ├─ next-env.d.ts
│  │  ├─ next.config.ts
│  │  ├─ package.json
│  │  ├─ postcss.config.mjs
│  │  ├─ public
│  │  │  ├─ file.svg
│  │  │  ├─ globe.svg
│  │  │  ├─ next.svg
│  │  │  ├─ vercel.svg
│  │  │  └─ window.svg
│  │  ├─ src
│  │  │  ├─ app
│  │  │  │  ├─ (app)
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ (auth)
│  │  │  │  │  ├─ forgot-password
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  ├─ login
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ reset-password
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ signup
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ verify-otp
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ favicon.ico
│  │  │  │  ├─ favicon.ico:Zone.Identifier
│  │  │  │  ├─ globals.css
│  │  │  │  └─ layout.tsx
│  │  │  ├─ components
│  │  │  │  ├─ announcement
│  │  │  │  │  └─ AnnouncementBillboard.tsx
│  │  │  │  ├─ auth
│  │  │  │  │  ├─ AuthBrandPanel.tsx
│  │  │  │  │  ├─ AuthField.tsx
│  │  │  │  │  ├─ AuthHeroDevice.tsx
│  │  │  │  │  ├─ AuthLogoMark.tsx
│  │  │  │  │  ├─ FormMessage.tsx
│  │  │  │  │  ├─ OAuthButtons.tsx
│  │  │  │  │  ├─ OtpInput.tsx
│  │  │  │  │  ├─ PasswordStrengthMeter.tsx
│  │  │  │  │  └─ SubmitButton.tsx
│  │  │  │  ├─ camera
│  │  │  │  │  ├─ CameraFeed.tsx
│  │  │  │  │  ├─ CameraFeedSkeleton.tsx
│  │  │  │  │  ├─ ControlBar.tsx
│  │  │  │  │  ├─ DetectionCard.tsx
│  │  │  │  │  ├─ DetectionOverlay.tsx
│  │  │  │  │  ├─ ModelPicker.tsx
│  │  │  │  │  ├─ PhotoCustomizePanel.tsx
│  │  │  │  │  ├─ ScanReticle.tsx
│  │  │  │  │  ├─ TelemetryHUD.tsx
│  │  │  │  │  └─ TemplatePicker.tsx
│  │  │  │  ├─ chat
│  │  │  │  │  └─ ChatEmbed.tsx
│  │  │  │  ├─ onboarding
│  │  │  │  │  ├─ SettingsModal.tsx
│  │  │  │  │  ├─ ShortcutsModal.tsx
│  │  │  │  │  └─ TourGuide.tsx
│  │  │  │  ├─ shell
│  │  │  │  │  ├─ AppShell.tsx
│  │  │  │  │  ├─ BottomNav.tsx
│  │  │  │  │  ├─ ExitConfirmModal.tsx
│  │  │  │  │  ├─ ScanViewerModal.tsx
│  │  │  │  │  ├─ Sidebar.tsx
│  │  │  │  │  ├─ SidebarSkeleton.tsx
│  │  │  │  │  ├─ ThemeEffect.tsx
│  │  │  │  │  ├─ TopBar.tsx
│  │  │  │  │  └─ navItems.ts
│  │  │  │  └─ ui
│  │  │  │     ├─ LogoMark.tsx
│  │  │  │     ├─ Magnetic.tsx
│  │  │  │     ├─ button.tsx
│  │  │  │     ├─ separator.tsx
│  │  │  │     ├─ sidebar.tsx
│  │  │  │     └─ tooltip.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ useBackButtonGuard.ts
│  │  │  │  ├─ useCamera.ts
│  │  │  │  ├─ useCurrentUser.ts
│  │  │  │  ├─ useGlobalShortcuts.ts
│  │  │  │  ├─ useRelativeTime.ts
│  │  │  │  ├─ useVisionPipeline.ts
│  │  │  │  └─ useVoiceInput.ts
│  │  │  ├─ lib
│  │  │  │  ├─ auth-api.ts
│  │  │  │  ├─ layout.ts
│  │  │  │  ├─ onboarding-debug.ts
│  │  │  │  ├─ scan-effects.ts
│  │  │  │  ├─ utils.ts
│  │  │  │  └─ vision
│  │  │  │     └─ frame-pipeline.ts
│  │  │  ├─ proxy.ts
│  │  │  ├─ store
│  │  │  │  └─ useAppStore.ts
│  │  │  ├─ workers
│  │  │  │  └─ vision.worker.ts
│  │  │  └─ {components
│  │  │     └─ shell,components
│  │  │        └─ ui,hooks,store,app}
│  │  └─ tsconfig.json
│  ├─ icon.svg
│  ├─ marketing
│  │  ├─ .astro
│  │  │  ├─ collections
│  │  │  ├─ content.d.ts
│  │  │  ├─ dev.json
│  │  │  ├─ settings.json
│  │  │  └─ types.d.ts
│  │  ├─ AGENTS.md
│  │  ├─ CLAUDE.md
│  │  ├─ PORT_NOTES.md
│  │  ├─ README.md
│  │  ├─ astro.config.mjs
│  │  ├─ package.json
│  │  ├─ public
│  │  │  ├─ favicon.ico
│  │  │  └─ favicon.svg
│  │  ├─ src
│  │  │  ├─ components
│  │  │  │  ├─ AboutSection.module.css
│  │  │  │  ├─ AboutSection.tsx
│  │  │  │  ├─ CollapsibleReveal.astro
│  │  │  │  ├─ CtaSection.module.css
│  │  │  │  ├─ CtaSection.tsx
│  │  │  │  ├─ CustomCursor.module.css
│  │  │  │  ├─ CustomCursor.tsx
│  │  │  │  ├─ FabStack.module.css
│  │  │  │  ├─ FabStack.tsx
│  │  │  │  ├─ Features.module.css
│  │  │  │  ├─ Features.tsx
│  │  │  │  ├─ Gallery.module.css
│  │  │  │  ├─ Gallery.tsx
│  │  │  │  ├─ Hero.module.css
│  │  │  │  ├─ Hero.tsx
│  │  │  │  ├─ LoadingScreen.module.css
│  │  │  │  ├─ MagneticLink.tsx
│  │  │  │  ├─ Marquee.module.css
│  │  │  │  ├─ Marquee.tsx
│  │  │  │  ├─ Nav.module.css
│  │  │  │  ├─ NavWithLoader.tsx
│  │  │  │  ├─ ProgressBar.module.css
│  │  │  │  ├─ ProgressBar.tsx
│  │  │  │  ├─ Section.module.css
│  │  │  │  ├─ SectionDots.module.css
│  │  │  │  ├─ SectionDots.tsx
│  │  │  │  ├─ Showcase.module.css
│  │  │  │  ├─ Showcase.tsx
│  │  │  │  ├─ Sidebar.module.css
│  │  │  │  ├─ Sidebar.tsx
│  │  │  │  ├─ SmoothScroll.tsx
│  │  │  │  ├─ StarField.tsx
│  │  │  │  ├─ StatsSection.module.css
│  │  │  │  ├─ StatsSection.tsx
│  │  │  │  ├─ ThemeSwitcher.module.css
│  │  │  │  ├─ ThemeSwitcher.tsx
│  │  │  │  ├─ Typewriter.module.css
│  │  │  │  ├─ Typewriter.tsx
│  │  │  │  ├─ VideoSection.module.css
│  │  │  │  ├─ VideoSection.tsx
│  │  │  │  ├─ Vision.module.css
│  │  │  │  ├─ Vision.tsx
│  │  │  │  ├─ ZoomSection.module.css
│  │  │  │  └─ ZoomSection.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ useOffscreenPause.ts
│  │  │  │  └─ useReveal.ts
│  │  │  ├─ layouts
│  │  │  │  └─ Layout.astro
│  │  │  ├─ lib
│  │  │  │  └─ app-links.ts
│  │  │  ├─ pages
│  │  │  │  └─ index.astro
│  │  │  ├─ stores
│  │  │  │  └─ ui.ts
│  │  │  └─ styles
│  │  │     └─ global.css
│  │  └─ tsconfig.json
│  └─ shell
│     ├─ AGENTS.md
│     ├─ CLAUDE.md
│     ├─ README.md
│     ├─ components.json
│     ├─ eslint.config.mjs
│     ├─ next-env.d.ts
│     ├─ next.config.ts
│     ├─ package.json
│     ├─ postcss.config.mjs
│     ├─ public
│     │  ├─ file.svg
│     │  ├─ globe.svg
│     │  ├─ next.svg
│     │  ├─ vercel.svg
│     │  └─ window.svg
│     ├─ src
│     │  ├─ app
│     │  │  ├─ favicon.ico
│     │  │  ├─ globals.css
│     │  │  ├─ layout.tsx
│     │  │  └─ page.tsx
│     │  ├─ components
│     │  │  └─ ui
│     │  │     └─ button.tsx
│     │  └─ lib
│     │     ├─ store
│     │     │  └─ windows.ts
│     │     └─ utils.ts
│     └─ tsconfig.json
├─ apps.zip
├─ apps.zip.tmp
├─ docker-compose.yml
├─ eslint.config.js
├─ package.json
├─ packages
│  ├─ config
│  │  ├─ eslint.config.js
│  │  └─ tsconfig.base.json
│  ├─ eslint-config
│  │  ├─ README.md
│  │  ├─ base.js
│  │  ├─ next.js
│  │  ├─ package.json
│  │  └─ react-internal.js
│  ├─ ipc
│  ├─ typescript-config
│  │  ├─ base.json
│  │  ├─ nextjs.json
│  │  ├─ package.json
│  │  └─ react-library.json
│  └─ ui
│     ├─ eslint.config.mjs
│     ├─ package.json
│     ├─ src
│     │  ├─ button.tsx
│     │  ├─ card.tsx
│     │  └─ code.tsx
│     └─ tsconfig.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ services
│  ├─ auth
│  └─ gateway
│     ├─ .prettierrc
│     ├─ README.md
│     ├─ cookies.txt
│     ├─ eslint.config.mjs
│     ├─ nest-cli.json
│     ├─ package.json
│     ├─ prisma
│     │  ├─ migrations
│     │  │  ├─ 20260724202946_init
│     │  │  │  └─ migration.sql
│     │  │  ├─ 20260725082640_add_github_oauth
│     │  │  │  └─ migration.sql
│     │  │  ├─ 20260725084656_remove_facebook_oauth
│     │  │  │  └─ migration.sql
│     │  │  └─ migration_lock.toml
│     │  └─ schema.prisma
│     ├─ src
│     │  ├─ app.controller.spec.ts
│     │  ├─ app.controller.ts
│     │  ├─ app.module.ts
│     │  ├─ app.service.ts
│     │  ├─ auth
│     │  │  ├─ audit.service.ts
│     │  │  ├─ auth.controller.ts
│     │  │  ├─ auth.module.ts
│     │  │  ├─ auth.service.ts
│     │  │  ├─ dto
│     │  │  │  ├─ login.dto.ts
│     │  │  │  ├─ reset-password.dto.ts
│     │  │  │  ├─ signup.dto.ts
│     │  │  │  └─ verify-otp.dto.ts
│     │  │  ├─ guards
│     │  │  │  ├─ jwt-auth.guard.ts
│     │  │  │  ├─ oauth.guard.ts
│     │  │  │  └─ refresh.guard.ts
│     │  │  ├─ oauth-config.service.ts
│     │  │  └─ strategies
│     │  │     ├─ github.strategy.ts
│     │  │     ├─ google.strategy.ts
│     │  │     ├─ jwt.strategy.ts
│     │  │     └─ oauth-profile.interface.ts
│     │  ├─ common
│     │  │  ├─ cookies.ts
│     │  │  ├─ decorators
│     │  │  │  └─ current-user.decorator.ts
│     │  │  ├─ filters
│     │  │  │  └─ all-exceptions.filter.ts
│     │  │  ├─ guards
│     │  │  └─ time.ts
│     │  ├─ mail
│     │  │  ├─ mail.module.ts
│     │  │  └─ mail.service.ts
│     │  ├─ main.ts
│     │  ├─ otp
│     │  │  ├─ otp.module.ts
│     │  │  └─ otp.service.ts
│     │  ├─ prisma
│     │  │  ├─ prisma.module.ts
│     │  │  └─ prisma.service.ts
│     │  ├─ redis
│     │  │  ├─ redis.module.ts
│     │  │  └─ redis.service.ts
│     │  └─ users
│     │     ├─ users.module.ts
│     │     └─ users.service.ts
│     ├─ test
│     │  ├─ app.e2e-spec.ts
│     │  └─ jest-e2e.json
│     └─ tsconfig.json
├─ services.zip
└─ turbo.json

```

```
web-os
├─ .husky
│  ├─ _
│  │  ├─ applypatch-msg
│  │  ├─ commit-msg
│  │  ├─ h
│  │  ├─ husky.sh
│  │  ├─ post-applypatch
│  │  ├─ post-checkout
│  │  ├─ post-commit
│  │  ├─ post-merge
│  │  ├─ post-rewrite
│  │  ├─ pre-applypatch
│  │  ├─ pre-auto-gc
│  │  ├─ pre-commit
│  │  ├─ pre-merge-commit
│  │  ├─ pre-push
│  │  ├─ pre-rebase
│  │  └─ prepare-commit-msg
│  └─ pre-commit
├─ .npmrc
├─ README.md
├─ apps
│  ├─ chat
│  │  ├─ README.md
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ postcss.config.js
│  │  ├─ public
│  │  │  └─ favicon.svg
│  │  ├─ src
│  │  │  ├─ App.vue
│  │  │  ├─ components
│  │  │  │  ├─ chat
│  │  │  │  │  ├─ MarkdownRenderer.vue
│  │  │  │  │  ├─ MessageBubble.vue
│  │  │  │  │  ├─ MessageList.vue
│  │  │  │  │  └─ TypingIndicator.vue
│  │  │  │  ├─ common
│  │  │  │  │  ├─ AnnouncementBillboard.vue
│  │  │  │  │  ├─ DoodleLogo.vue
│  │  │  │  │  ├─ IconButton.vue
│  │  │  │  │  ├─ LogoBadge.vue
│  │  │  │  │  ├─ LogoMark.vue
│  │  │  │  │  ├─ OnboardingTour.vue
│  │  │  │  │  ├─ SettingsModal.vue
│  │  │  │  │  ├─ ShortcutsModal.vue
│  │  │  │  │  ├─ SkeletonBlock.vue
│  │  │  │  │  ├─ ThemeSwitcher.vue
│  │  │  │  │  └─ TooltipHost.vue
│  │  │  │  ├─ composer
│  │  │  │  │  ├─ Composer.vue
│  │  │  │  │  ├─ MicRecorder.vue
│  │  │  │  │  └─ ModelPicker.vue
│  │  │  │  └─ sidebar
│  │  │  │     ├─ ConversationItem.vue
│  │  │  │     ├─ ConversationSidebar.vue
│  │  │  │     ├─ ProfileMenu.vue
│  │  │  │     └─ SidebarBody.vue
│  │  │  ├─ composables
│  │  │  │  ├─ useAutoResizeTextarea.ts
│  │  │  │  ├─ useBridge.ts
│  │  │  │  ├─ useComposerMobileSheet.ts
│  │  │  │  ├─ useDoodle.ts
│  │  │  │  ├─ useSSEChat.ts
│  │  │  │  └─ useShortcuts.ts
│  │  │  ├─ i18n
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ locales
│  │  │  │  │  ├─ en.ts
│  │  │  │  │  ├─ es.ts
│  │  │  │  │  ├─ fr.ts
│  │  │  │  │  ├─ hi.ts
│  │  │  │  │  └─ zh.ts
│  │  │  │  └─ messageSchema.ts
│  │  │  ├─ lib
│  │  │  │  ├─ doodleEvents.ts
│  │  │  │  ├─ markdown.ts
│  │  │  │  ├─ mockResponder.ts
│  │  │  │  ├─ tooltipDirective.ts
│  │  │  │  └─ utils.ts
│  │  │  ├─ main.ts
│  │  │  ├─ router
│  │  │  │  └─ index.ts
│  │  │  ├─ stores
│  │  │  │  ├─ chat.ts
│  │  │  │  ├─ settings.ts
│  │  │  │  ├─ theme.ts
│  │  │  │  ├─ tooltip.ts
│  │  │  │  ├─ ui.ts
│  │  │  │  └─ user.ts
│  │  │  ├─ styles
│  │  │  │  ├─ globals.css
│  │  │  │  └─ tokens.css
│  │  │  ├─ types
│  │  │  │  └─ chat.ts
│  │  │  ├─ views
│  │  │  │  └─ ChatView.vue
│  │  │  └─ vite-env.d.ts
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.node.json
│  │  └─ vite.config.ts
│  ├─ explorer
│  │  ├─ AGENTS.md
│  │  ├─ CLAUDE.md
│  │  ├─ README.md
│  │  ├─ components.json
│  │  ├─ eslint.config.mjs
│  │  ├─ next-env.d.ts
│  │  ├─ next.config.ts
│  │  ├─ package.json
│  │  ├─ postcss.config.mjs
│  │  ├─ public
│  │  │  ├─ file.svg
│  │  │  ├─ globe.svg
│  │  │  ├─ next.svg
│  │  │  ├─ vercel.svg
│  │  │  └─ window.svg
│  │  ├─ src
│  │  │  ├─ app
│  │  │  │  ├─ (app)
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ (auth)
│  │  │  │  │  ├─ forgot-password
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  ├─ login
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ reset-password
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ signup
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ verify-otp
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ favicon.ico
│  │  │  │  ├─ favicon.ico:Zone.Identifier
│  │  │  │  ├─ globals.css
│  │  │  │  └─ layout.tsx
│  │  │  ├─ components
│  │  │  │  ├─ announcement
│  │  │  │  │  └─ AnnouncementBillboard.tsx
│  │  │  │  ├─ auth
│  │  │  │  │  ├─ AuthBrandPanel.tsx
│  │  │  │  │  ├─ AuthField.tsx
│  │  │  │  │  ├─ AuthHeroDevice.tsx
│  │  │  │  │  ├─ AuthLogoMark.tsx
│  │  │  │  │  ├─ FormMessage.tsx
│  │  │  │  │  ├─ OAuthButtons.tsx
│  │  │  │  │  ├─ OtpInput.tsx
│  │  │  │  │  ├─ PasswordStrengthMeter.tsx
│  │  │  │  │  └─ SubmitButton.tsx
│  │  │  │  ├─ camera
│  │  │  │  │  ├─ CameraFeed.tsx
│  │  │  │  │  ├─ CameraFeedSkeleton.tsx
│  │  │  │  │  ├─ ControlBar.tsx
│  │  │  │  │  ├─ DetectionCard.tsx
│  │  │  │  │  ├─ DetectionOverlay.tsx
│  │  │  │  │  ├─ ModelPicker.tsx
│  │  │  │  │  ├─ PhotoCustomizePanel.tsx
│  │  │  │  │  ├─ ScanReticle.tsx
│  │  │  │  │  ├─ TelemetryHUD.tsx
│  │  │  │  │  └─ TemplatePicker.tsx
│  │  │  │  ├─ chat
│  │  │  │  │  └─ ChatEmbed.tsx
│  │  │  │  ├─ onboarding
│  │  │  │  │  ├─ SettingsModal.tsx
│  │  │  │  │  ├─ ShortcutsModal.tsx
│  │  │  │  │  └─ TourGuide.tsx
│  │  │  │  ├─ shell
│  │  │  │  │  ├─ AppShell.tsx
│  │  │  │  │  ├─ BottomNav.tsx
│  │  │  │  │  ├─ ExitConfirmModal.tsx
│  │  │  │  │  ├─ ScanViewerModal.tsx
│  │  │  │  │  ├─ Sidebar.tsx
│  │  │  │  │  ├─ SidebarSkeleton.tsx
│  │  │  │  │  ├─ ThemeEffect.tsx
│  │  │  │  │  ├─ TopBar.tsx
│  │  │  │  │  └─ navItems.ts
│  │  │  │  └─ ui
│  │  │  │     ├─ LogoMark.tsx
│  │  │  │     ├─ Magnetic.tsx
│  │  │  │     ├─ button.tsx
│  │  │  │     ├─ separator.tsx
│  │  │  │     ├─ sidebar.tsx
│  │  │  │     └─ tooltip.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ useBackButtonGuard.ts
│  │  │  │  ├─ useCamera.ts
│  │  │  │  ├─ useCurrentUser.ts
│  │  │  │  ├─ useGlobalShortcuts.ts
│  │  │  │  ├─ useRelativeTime.ts
│  │  │  │  ├─ useVisionPipeline.ts
│  │  │  │  └─ useVoiceInput.ts
│  │  │  ├─ lib
│  │  │  │  ├─ auth-api.ts
│  │  │  │  ├─ layout.ts
│  │  │  │  ├─ onboarding-debug.ts
│  │  │  │  ├─ scan-effects.ts
│  │  │  │  ├─ utils.ts
│  │  │  │  └─ vision
│  │  │  │     └─ frame-pipeline.ts
│  │  │  ├─ proxy.ts
│  │  │  ├─ store
│  │  │  │  └─ useAppStore.ts
│  │  │  ├─ workers
│  │  │  │  └─ vision.worker.ts
│  │  │  └─ {components
│  │  │     └─ shell,components
│  │  │        └─ ui,hooks,store,app}
│  │  └─ tsconfig.json
│  ├─ icon.svg
│  ├─ marketing
│  │  ├─ .astro
│  │  │  ├─ collections
│  │  │  ├─ content.d.ts
│  │  │  ├─ dev.json
│  │  │  ├─ settings.json
│  │  │  └─ types.d.ts
│  │  ├─ AGENTS.md
│  │  ├─ CLAUDE.md
│  │  ├─ PORT_NOTES.md
│  │  ├─ README.md
│  │  ├─ astro.config.mjs
│  │  ├─ package.json
│  │  ├─ public
│  │  │  ├─ favicon.ico
│  │  │  └─ favicon.svg
│  │  ├─ src
│  │  │  ├─ components
│  │  │  │  ├─ AboutSection.module.css
│  │  │  │  ├─ AboutSection.tsx
│  │  │  │  ├─ CollapsibleReveal.astro
│  │  │  │  ├─ CtaSection.module.css
│  │  │  │  ├─ CtaSection.tsx
│  │  │  │  ├─ CustomCursor.module.css
│  │  │  │  ├─ CustomCursor.tsx
│  │  │  │  ├─ FabStack.module.css
│  │  │  │  ├─ FabStack.tsx
│  │  │  │  ├─ Features.module.css
│  │  │  │  ├─ Features.tsx
│  │  │  │  ├─ Gallery.module.css
│  │  │  │  ├─ Gallery.tsx
│  │  │  │  ├─ Hero.module.css
│  │  │  │  ├─ Hero.tsx
│  │  │  │  ├─ LoadingScreen.module.css
│  │  │  │  ├─ MagneticLink.tsx
│  │  │  │  ├─ Marquee.module.css
│  │  │  │  ├─ Marquee.tsx
│  │  │  │  ├─ Nav.module.css
│  │  │  │  ├─ NavWithLoader.tsx
│  │  │  │  ├─ ProgressBar.module.css
│  │  │  │  ├─ ProgressBar.tsx
│  │  │  │  ├─ Section.module.css
│  │  │  │  ├─ SectionDots.module.css
│  │  │  │  ├─ SectionDots.tsx
│  │  │  │  ├─ Showcase.module.css
│  │  │  │  ├─ Showcase.tsx
│  │  │  │  ├─ Sidebar.module.css
│  │  │  │  ├─ Sidebar.tsx
│  │  │  │  ├─ SmoothScroll.tsx
│  │  │  │  ├─ StarField.tsx
│  │  │  │  ├─ StatsSection.module.css
│  │  │  │  ├─ StatsSection.tsx
│  │  │  │  ├─ ThemeSwitcher.module.css
│  │  │  │  ├─ ThemeSwitcher.tsx
│  │  │  │  ├─ Typewriter.module.css
│  │  │  │  ├─ Typewriter.tsx
│  │  │  │  ├─ VideoSection.module.css
│  │  │  │  ├─ VideoSection.tsx
│  │  │  │  ├─ Vision.module.css
│  │  │  │  ├─ Vision.tsx
│  │  │  │  ├─ ZoomSection.module.css
│  │  │  │  └─ ZoomSection.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ useOffscreenPause.ts
│  │  │  │  └─ useReveal.ts
│  │  │  ├─ layouts
│  │  │  │  └─ Layout.astro
│  │  │  ├─ lib
│  │  │  │  └─ app-links.ts
│  │  │  ├─ pages
│  │  │  │  └─ index.astro
│  │  │  ├─ stores
│  │  │  │  └─ ui.ts
│  │  │  └─ styles
│  │  │     └─ global.css
│  │  └─ tsconfig.json
│  └─ shell
│     ├─ AGENTS.md
│     ├─ CLAUDE.md
│     ├─ README.md
│     ├─ components.json
│     ├─ eslint.config.mjs
│     ├─ next-env.d.ts
│     ├─ next.config.ts
│     ├─ package.json
│     ├─ postcss.config.mjs
│     ├─ public
│     │  ├─ file.svg
│     │  ├─ globe.svg
│     │  ├─ next.svg
│     │  ├─ vercel.svg
│     │  └─ window.svg
│     ├─ src
│     │  ├─ app
│     │  │  ├─ favicon.ico
│     │  │  ├─ globals.css
│     │  │  ├─ layout.tsx
│     │  │  └─ page.tsx
│     │  ├─ components
│     │  │  └─ ui
│     │  │     └─ button.tsx
│     │  └─ lib
│     │     ├─ store
│     │     │  └─ windows.ts
│     │     └─ utils.ts
│     └─ tsconfig.json
├─ apps.zip
├─ apps.zip.tmp
├─ docker-compose.yml
├─ eslint.config.js
├─ package.json
├─ packages
│  ├─ config
│  │  ├─ eslint.config.js
│  │  └─ tsconfig.base.json
│  ├─ eslint-config
│  │  ├─ README.md
│  │  ├─ base.js
│  │  ├─ next.js
│  │  ├─ package.json
│  │  └─ react-internal.js
│  ├─ ipc
│  ├─ typescript-config
│  │  ├─ base.json
│  │  ├─ nextjs.json
│  │  ├─ package.json
│  │  └─ react-library.json
│  └─ ui
│     ├─ eslint.config.mjs
│     ├─ package.json
│     ├─ src
│     │  ├─ button.tsx
│     │  ├─ card.tsx
│     │  └─ code.tsx
│     └─ tsconfig.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ services
│  ├─ auth
│  └─ gateway
│     ├─ .prettierrc
│     ├─ README.md
│     ├─ cookies.txt
│     ├─ eslint.config.mjs
│     ├─ nest-cli.json
│     ├─ package.json
│     ├─ prisma
│     │  ├─ migrations
│     │  │  ├─ 20260724202946_init
│     │  │  │  └─ migration.sql
│     │  │  ├─ 20260725082640_add_github_oauth
│     │  │  │  └─ migration.sql
│     │  │  ├─ 20260725084656_remove_facebook_oauth
│     │  │  │  └─ migration.sql
│     │  │  └─ migration_lock.toml
│     │  └─ schema.prisma
│     ├─ src
│     │  ├─ app.controller.spec.ts
│     │  ├─ app.controller.ts
│     │  ├─ app.module.ts
│     │  ├─ app.service.ts
│     │  ├─ auth
│     │  │  ├─ audit.service.ts
│     │  │  ├─ auth.controller.ts
│     │  │  ├─ auth.module.ts
│     │  │  ├─ auth.service.ts
│     │  │  ├─ dto
│     │  │  │  ├─ login.dto.ts
│     │  │  │  ├─ reset-password.dto.ts
│     │  │  │  ├─ signup.dto.ts
│     │  │  │  └─ verify-otp.dto.ts
│     │  │  ├─ guards
│     │  │  │  ├─ jwt-auth.guard.ts
│     │  │  │  ├─ oauth.guard.ts
│     │  │  │  └─ refresh.guard.ts
│     │  │  ├─ oauth-config.service.ts
│     │  │  └─ strategies
│     │  │     ├─ github.strategy.ts
│     │  │     ├─ google.strategy.ts
│     │  │     ├─ jwt.strategy.ts
│     │  │     └─ oauth-profile.interface.ts
│     │  ├─ common
│     │  │  ├─ cookies.ts
│     │  │  ├─ decorators
│     │  │  │  └─ current-user.decorator.ts
│     │  │  ├─ filters
│     │  │  │  └─ all-exceptions.filter.ts
│     │  │  ├─ guards
│     │  │  └─ time.ts
│     │  ├─ mail
│     │  │  ├─ mail.module.ts
│     │  │  └─ mail.service.ts
│     │  ├─ main.ts
│     │  ├─ otp
│     │  │  ├─ otp.module.ts
│     │  │  └─ otp.service.ts
│     │  ├─ prisma
│     │  │  ├─ prisma.module.ts
│     │  │  └─ prisma.service.ts
│     │  ├─ redis
│     │  │  ├─ redis.module.ts
│     │  │  └─ redis.service.ts
│     │  └─ users
│     │     ├─ users.module.ts
│     │     └─ users.service.ts
│     ├─ test
│     │  ├─ app.e2e-spec.ts
│     │  └─ jest-e2e.json
│     └─ tsconfig.json
├─ services.zip
└─ turbo.json

```

```
web-os
├─ .husky
│  ├─ _
│  │  ├─ applypatch-msg
│  │  ├─ commit-msg
│  │  ├─ h
│  │  ├─ husky.sh
│  │  ├─ post-applypatch
│  │  ├─ post-checkout
│  │  ├─ post-commit
│  │  ├─ post-merge
│  │  ├─ post-rewrite
│  │  ├─ pre-applypatch
│  │  ├─ pre-auto-gc
│  │  ├─ pre-commit
│  │  ├─ pre-merge-commit
│  │  ├─ pre-push
│  │  ├─ pre-rebase
│  │  └─ prepare-commit-msg
│  └─ pre-commit
├─ .npmrc
├─ README.md
├─ apps
│  ├─ chat
│  │  ├─ README.md
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ postcss.config.js
│  │  ├─ public
│  │  │  └─ favicon.svg
│  │  ├─ src
│  │  │  ├─ App.vue
│  │  │  ├─ components
│  │  │  │  ├─ chat
│  │  │  │  │  ├─ MarkdownRenderer.vue
│  │  │  │  │  ├─ MessageBubble.vue
│  │  │  │  │  ├─ MessageList.vue
│  │  │  │  │  └─ TypingIndicator.vue
│  │  │  │  ├─ common
│  │  │  │  │  ├─ AnnouncementBillboard.vue
│  │  │  │  │  ├─ DoodleLogo.vue
│  │  │  │  │  ├─ IconButton.vue
│  │  │  │  │  ├─ LogoBadge.vue
│  │  │  │  │  ├─ LogoMark.vue
│  │  │  │  │  ├─ OnboardingTour.vue
│  │  │  │  │  ├─ SettingsModal.vue
│  │  │  │  │  ├─ ShortcutsModal.vue
│  │  │  │  │  ├─ SkeletonBlock.vue
│  │  │  │  │  ├─ ThemeSwitcher.vue
│  │  │  │  │  └─ TooltipHost.vue
│  │  │  │  ├─ composer
│  │  │  │  │  ├─ Composer.vue
│  │  │  │  │  ├─ MicRecorder.vue
│  │  │  │  │  └─ ModelPicker.vue
│  │  │  │  └─ sidebar
│  │  │  │     ├─ ConversationItem.vue
│  │  │  │     ├─ ConversationSidebar.vue
│  │  │  │     ├─ ProfileMenu.vue
│  │  │  │     └─ SidebarBody.vue
│  │  │  ├─ composables
│  │  │  │  ├─ useAutoResizeTextarea.ts
│  │  │  │  ├─ useBridge.ts
│  │  │  │  ├─ useComposerMobileSheet.ts
│  │  │  │  ├─ useDoodle.ts
│  │  │  │  ├─ useSSEChat.ts
│  │  │  │  └─ useShortcuts.ts
│  │  │  ├─ i18n
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ locales
│  │  │  │  │  ├─ en.ts
│  │  │  │  │  ├─ es.ts
│  │  │  │  │  ├─ fr.ts
│  │  │  │  │  ├─ hi.ts
│  │  │  │  │  └─ zh.ts
│  │  │  │  └─ messageSchema.ts
│  │  │  ├─ lib
│  │  │  │  ├─ doodleEvents.ts
│  │  │  │  ├─ markdown.ts
│  │  │  │  ├─ mockResponder.ts
│  │  │  │  ├─ tooltipDirective.ts
│  │  │  │  └─ utils.ts
│  │  │  ├─ main.ts
│  │  │  ├─ router
│  │  │  │  └─ index.ts
│  │  │  ├─ stores
│  │  │  │  ├─ chat.ts
│  │  │  │  ├─ settings.ts
│  │  │  │  ├─ theme.ts
│  │  │  │  ├─ tooltip.ts
│  │  │  │  ├─ ui.ts
│  │  │  │  └─ user.ts
│  │  │  ├─ styles
│  │  │  │  ├─ globals.css
│  │  │  │  └─ tokens.css
│  │  │  ├─ types
│  │  │  │  └─ chat.ts
│  │  │  ├─ views
│  │  │  │  └─ ChatView.vue
│  │  │  └─ vite-env.d.ts
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.node.json
│  │  └─ vite.config.ts
│  ├─ explorer
│  │  ├─ AGENTS.md
│  │  ├─ CLAUDE.md
│  │  ├─ README.md
│  │  ├─ components.json
│  │  ├─ eslint.config.mjs
│  │  ├─ next-env.d.ts
│  │  ├─ next.config.ts
│  │  ├─ package.json
│  │  ├─ postcss.config.mjs
│  │  ├─ public
│  │  │  ├─ file.svg
│  │  │  ├─ globe.svg
│  │  │  ├─ next.svg
│  │  │  ├─ vercel.svg
│  │  │  └─ window.svg
│  │  ├─ src
│  │  │  ├─ app
│  │  │  │  ├─ (app)
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ (auth)
│  │  │  │  │  ├─ forgot-password
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  ├─ login
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ reset-password
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ signup
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ verify-otp
│  │  │  │  │     └─ page.tsx
│  │  │  │  ├─ favicon.ico
│  │  │  │  ├─ favicon.ico:Zone.Identifier
│  │  │  │  ├─ globals.css
│  │  │  │  └─ layout.tsx
│  │  │  ├─ components
│  │  │  │  ├─ announcement
│  │  │  │  │  └─ AnnouncementBillboard.tsx
│  │  │  │  ├─ auth
│  │  │  │  │  ├─ AuthBrandPanel.tsx
│  │  │  │  │  ├─ AuthField.tsx
│  │  │  │  │  ├─ AuthHeroDevice.tsx
│  │  │  │  │  ├─ AuthLogoMark.tsx
│  │  │  │  │  ├─ FormMessage.tsx
│  │  │  │  │  ├─ OAuthButtons.tsx
│  │  │  │  │  ├─ OtpInput.tsx
│  │  │  │  │  ├─ PasswordStrengthMeter.tsx
│  │  │  │  │  └─ SubmitButton.tsx
│  │  │  │  ├─ camera
│  │  │  │  │  ├─ CameraFeed.tsx
│  │  │  │  │  ├─ CameraFeedSkeleton.tsx
│  │  │  │  │  ├─ ControlBar.tsx
│  │  │  │  │  ├─ DetectionCard.tsx
│  │  │  │  │  ├─ DetectionOverlay.tsx
│  │  │  │  │  ├─ ModelPicker.tsx
│  │  │  │  │  ├─ PhotoCustomizePanel.tsx
│  │  │  │  │  ├─ ScanReticle.tsx
│  │  │  │  │  ├─ TelemetryHUD.tsx
│  │  │  │  │  └─ TemplatePicker.tsx
│  │  │  │  ├─ chat
│  │  │  │  │  └─ ChatEmbed.tsx
│  │  │  │  ├─ onboarding
│  │  │  │  │  ├─ SettingsModal.tsx
│  │  │  │  │  ├─ ShortcutsModal.tsx
│  │  │  │  │  └─ TourGuide.tsx
│  │  │  │  ├─ shell
│  │  │  │  │  ├─ AppShell.tsx
│  │  │  │  │  ├─ BottomNav.tsx
│  │  │  │  │  ├─ ExitConfirmModal.tsx
│  │  │  │  │  ├─ ScanViewerModal.tsx
│  │  │  │  │  ├─ Sidebar.tsx
│  │  │  │  │  ├─ SidebarSkeleton.tsx
│  │  │  │  │  ├─ ThemeEffect.tsx
│  │  │  │  │  ├─ TopBar.tsx
│  │  │  │  │  └─ navItems.ts
│  │  │  │  └─ ui
│  │  │  │     ├─ LogoMark.tsx
│  │  │  │     ├─ Magnetic.tsx
│  │  │  │     ├─ button.tsx
│  │  │  │     ├─ separator.tsx
│  │  │  │     ├─ sidebar.tsx
│  │  │  │     └─ tooltip.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ useBackButtonGuard.ts
│  │  │  │  ├─ useCamera.ts
│  │  │  │  ├─ useCurrentUser.ts
│  │  │  │  ├─ useGlobalShortcuts.ts
│  │  │  │  ├─ useRelativeTime.ts
│  │  │  │  ├─ useVisionPipeline.ts
│  │  │  │  └─ useVoiceInput.ts
│  │  │  ├─ lib
│  │  │  │  ├─ auth-api.ts
│  │  │  │  ├─ layout.ts
│  │  │  │  ├─ onboarding-debug.ts
│  │  │  │  ├─ scan-effects.ts
│  │  │  │  ├─ utils.ts
│  │  │  │  └─ vision
│  │  │  │     └─ frame-pipeline.ts
│  │  │  ├─ proxy.ts
│  │  │  ├─ store
│  │  │  │  └─ useAppStore.ts
│  │  │  ├─ workers
│  │  │  │  └─ vision.worker.ts
│  │  │  └─ {components
│  │  │     └─ shell,components
│  │  │        └─ ui,hooks,store,app}
│  │  └─ tsconfig.json
│  ├─ icon.svg
│  ├─ marketing
│  │  ├─ .astro
│  │  │  ├─ collections
│  │  │  ├─ content.d.ts
│  │  │  ├─ dev.json
│  │  │  ├─ settings.json
│  │  │  └─ types.d.ts
│  │  ├─ AGENTS.md
│  │  ├─ CLAUDE.md
│  │  ├─ PORT_NOTES.md
│  │  ├─ README.md
│  │  ├─ astro.config.mjs
│  │  ├─ package.json
│  │  ├─ public
│  │  │  ├─ favicon.ico
│  │  │  └─ favicon.svg
│  │  ├─ src
│  │  │  ├─ components
│  │  │  │  ├─ AboutSection.module.css
│  │  │  │  ├─ AboutSection.tsx
│  │  │  │  ├─ CollapsibleReveal.astro
│  │  │  │  ├─ CtaSection.module.css
│  │  │  │  ├─ CtaSection.tsx
│  │  │  │  ├─ CustomCursor.module.css
│  │  │  │  ├─ CustomCursor.tsx
│  │  │  │  ├─ FabStack.module.css
│  │  │  │  ├─ FabStack.tsx
│  │  │  │  ├─ Features.module.css
│  │  │  │  ├─ Features.tsx
│  │  │  │  ├─ Gallery.module.css
│  │  │  │  ├─ Gallery.tsx
│  │  │  │  ├─ Hero.module.css
│  │  │  │  ├─ Hero.tsx
│  │  │  │  ├─ LoadingScreen.module.css
│  │  │  │  ├─ MagneticLink.tsx
│  │  │  │  ├─ Marquee.module.css
│  │  │  │  ├─ Marquee.tsx
│  │  │  │  ├─ Nav.module.css
│  │  │  │  ├─ NavWithLoader.tsx
│  │  │  │  ├─ ProgressBar.module.css
│  │  │  │  ├─ ProgressBar.tsx
│  │  │  │  ├─ Section.module.css
│  │  │  │  ├─ SectionDots.module.css
│  │  │  │  ├─ SectionDots.tsx
│  │  │  │  ├─ Showcase.module.css
│  │  │  │  ├─ Showcase.tsx
│  │  │  │  ├─ Sidebar.module.css
│  │  │  │  ├─ Sidebar.tsx
│  │  │  │  ├─ SmoothScroll.tsx
│  │  │  │  ├─ StarField.tsx
│  │  │  │  ├─ StatsSection.module.css
│  │  │  │  ├─ StatsSection.tsx
│  │  │  │  ├─ ThemeSwitcher.module.css
│  │  │  │  ├─ ThemeSwitcher.tsx
│  │  │  │  ├─ Typewriter.module.css
│  │  │  │  ├─ Typewriter.tsx
│  │  │  │  ├─ VideoSection.module.css
│  │  │  │  ├─ VideoSection.tsx
│  │  │  │  ├─ Vision.module.css
│  │  │  │  ├─ Vision.tsx
│  │  │  │  ├─ ZoomSection.module.css
│  │  │  │  └─ ZoomSection.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ useOffscreenPause.ts
│  │  │  │  └─ useReveal.ts
│  │  │  ├─ layouts
│  │  │  │  └─ Layout.astro
│  │  │  ├─ lib
│  │  │  │  └─ app-links.ts
│  │  │  ├─ pages
│  │  │  │  └─ index.astro
│  │  │  ├─ stores
│  │  │  │  └─ ui.ts
│  │  │  └─ styles
│  │  │     └─ global.css
│  │  └─ tsconfig.json
│  └─ shell
│     ├─ AGENTS.md
│     ├─ CLAUDE.md
│     ├─ README.md
│     ├─ components.json
│     ├─ eslint.config.mjs
│     ├─ next-env.d.ts
│     ├─ next.config.ts
│     ├─ package.json
│     ├─ postcss.config.mjs
│     ├─ public
│     │  ├─ file.svg
│     │  ├─ globe.svg
│     │  ├─ next.svg
│     │  ├─ vercel.svg
│     │  └─ window.svg
│     ├─ src
│     │  ├─ app
│     │  │  ├─ favicon.ico
│     │  │  ├─ globals.css
│     │  │  ├─ layout.tsx
│     │  │  └─ page.tsx
│     │  ├─ components
│     │  │  └─ ui
│     │  │     └─ button.tsx
│     │  └─ lib
│     │     ├─ store
│     │     │  └─ windows.ts
│     │     └─ utils.ts
│     └─ tsconfig.json
├─ apps.zip
├─ apps.zip.tmp
├─ docker-compose.yml
├─ eslint.config.js
├─ package.json
├─ packages
│  ├─ config
│  │  ├─ eslint.config.js
│  │  └─ tsconfig.base.json
│  ├─ eslint-config
│  │  ├─ README.md
│  │  ├─ base.js
│  │  ├─ next.js
│  │  ├─ package.json
│  │  └─ react-internal.js
│  ├─ ipc
│  ├─ typescript-config
│  │  ├─ base.json
│  │  ├─ nextjs.json
│  │  ├─ package.json
│  │  └─ react-library.json
│  └─ ui
│     ├─ eslint.config.mjs
│     ├─ package.json
│     ├─ src
│     │  ├─ button.tsx
│     │  ├─ card.tsx
│     │  └─ code.tsx
│     └─ tsconfig.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ services
│  ├─ auth
│  └─ gateway
│     ├─ .prettierrc
│     ├─ README.md
│     ├─ cookies.txt
│     ├─ eslint.config.mjs
│     ├─ nest-cli.json
│     ├─ package.json
│     ├─ prisma
│     │  ├─ migrations
│     │  │  ├─ 20260724202946_init
│     │  │  │  └─ migration.sql
│     │  │  ├─ 20260725082640_add_github_oauth
│     │  │  │  └─ migration.sql
│     │  │  ├─ 20260725084656_remove_facebook_oauth
│     │  │  │  └─ migration.sql
│     │  │  └─ migration_lock.toml
│     │  └─ schema.prisma
│     ├─ src
│     │  ├─ app.controller.spec.ts
│     │  ├─ app.controller.ts
│     │  ├─ app.module.ts
│     │  ├─ app.service.ts
│     │  ├─ auth
│     │  │  ├─ audit.service.ts
│     │  │  ├─ auth.controller.ts
│     │  │  ├─ auth.module.ts
│     │  │  ├─ auth.service.ts
│     │  │  ├─ dto
│     │  │  │  ├─ login.dto.ts
│     │  │  │  ├─ reset-password.dto.ts
│     │  │  │  ├─ signup.dto.ts
│     │  │  │  └─ verify-otp.dto.ts
│     │  │  ├─ guards
│     │  │  │  ├─ jwt-auth.guard.ts
│     │  │  │  ├─ oauth.guard.ts
│     │  │  │  └─ refresh.guard.ts
│     │  │  ├─ oauth-config.service.ts
│     │  │  └─ strategies
│     │  │     ├─ github.strategy.ts
│     │  │     ├─ google.strategy.ts
│     │  │     ├─ jwt.strategy.ts
│     │  │     └─ oauth-profile.interface.ts
│     │  ├─ common
│     │  │  ├─ cookies.ts
│     │  │  ├─ decorators
│     │  │  │  └─ current-user.decorator.ts
│     │  │  ├─ filters
│     │  │  │  └─ all-exceptions.filter.ts
│     │  │  ├─ guards
│     │  │  └─ time.ts
│     │  ├─ mail
│     │  │  ├─ mail.module.ts
│     │  │  └─ mail.service.ts
│     │  ├─ main.ts
│     │  ├─ otp
│     │  │  ├─ otp.module.ts
│     │  │  └─ otp.service.ts
│     │  ├─ prisma
│     │  │  ├─ prisma.module.ts
│     │  │  └─ prisma.service.ts
│     │  ├─ redis
│     │  │  ├─ redis.module.ts
│     │  │  └─ redis.service.ts
│     │  └─ users
│     │     ├─ users.module.ts
│     │     └─ users.service.ts
│     ├─ test
│     │  ├─ app.e2e-spec.ts
│     │  └─ jest-e2e.json
│     └─ tsconfig.json
├─ services.zip
└─ turbo.json

```
