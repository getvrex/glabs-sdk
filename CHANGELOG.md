# Changelog

## [2.0.0](https://github.com/getvrex/glabs-sdk/compare/v1.4.0...v2.0.0) (2026-02-27)


### ⚠ BREAKING CHANGES

* Major rewrite with new CLI tool, OpenAI-compatible server endpoint, Chrome/YesCaptcha as recommended reCAPTCHA providers, and auto token refresh. Reverts version tracking to let release-please handle the 2.0.0 release.

### Features

* add `glabs` CLI tool for terminal-based SDK access ([f6e7a2f](https://github.com/getvrex/glabs-sdk/commit/f6e7a2f0440a7aac03124b14729e6aff704cbdb7))
* add auto token refresh (ST→AT) and improve Playwright reCAPTCHA ([35de2a0](https://github.com/getvrex/glabs-sdk/commit/35de2a09db0af34090644e0c19367b66cc7c3d37))
* add Chrome persistent browser reCAPTCHA provider with fallback support ([8c8a34b](https://github.com/getvrex/glabs-sdk/commit/8c8a34b7caed88dab5f2e65a8271184c0cdfdba0))
* add Nano Banana 2 (NARWHAL) image model support ([2b59e31](https://github.com/getvrex/glabs-sdk/commit/2b59e312e438fd0cf053ef9fcc7e96f8e19deb42))
* add Playwright browser reCAPTCHA provider and OpenAI-compatible server ([a57addf](https://github.com/getvrex/glabs-sdk/commit/a57addfa491cd219961f6279761d3b81cd47f964))
* add pollOperation method to VideoService ([b0da027](https://github.com/getvrex/glabs-sdk/commit/b0da027d0d46445b1ad22c1940131df90efc80cc))
* add Vertex AI Imagen 4 image generation ([1ce74d9](https://github.com/getvrex/glabs-sdk/commit/1ce74d96e36a2c018cf4260bfdb98554407a7e46))
* add VertexVideoService for Veo 3 on Vertex AI ([062db8e](https://github.com/getvrex/glabs-sdk/commit/062db8ecc4db73d76193761b848c4b79f8bd979a))
* add WhiskService for Google Whisk API (GEM_PIX style-ref image gen) ([02b09da](https://github.com/getvrex/glabs-sdk/commit/02b09da711406d4149850aeb8e949d43c6b07159))
* **docs:** add LLM-friendly documentation and update logo ([33a4efe](https://github.com/getvrex/glabs-sdk/commit/33a4efe6eb2206dcc43e43a749cb2dd915d754b7))
* expose pollOperation on client.videos facade ([529c459](https://github.com/getvrex/glabs-sdk/commit/529c459aa8c9a13ddca8507b4bb170dfee79fac8))
* update API payloads to match latest Google Flow format ([9ea6c00](https://github.com/getvrex/glabs-sdk/commit/9ea6c003bbc6815040856ba44c7e33ab7df5833d))
* v2 SDK with CLI, OpenAI server, Chrome reCAPTCHA provider ([8df9d06](https://github.com/getvrex/glabs-sdk/commit/8df9d06be2a316e99bfb4df9c2d78f67275ae7c1))
* Vertex AI video support, CapSolver default, base64 i2v ([947fb28](https://github.com/getvrex/glabs-sdk/commit/947fb28d1184f15cf7ddacf8af238bf29283f20f))


### Bug Fixes

* **docs:** update reCAPTCHA provider examples to use regotcha ([b2cf081](https://github.com/getvrex/glabs-sdk/commit/b2cf0818f418f6dce8c39ccd8c4a88286ae48631))
* t2v portrait models need _portrait suffix for 9:16 aspect ratio ([fb7aff9](https://github.com/getvrex/glabs-sdk/commit/fb7aff9ccde87fd360e5f6434bbd7a26e99117e2))
* tier-model awareness — pro uses non-ultra models, correct sessionId format, fix reCAPTCHA URL ([17f73b7](https://github.com/getvrex/glabs-sdk/commit/17f73b7e0149812103f7759c15595087d41f61ac))
* use IMAGE_GENERATION action + recaptchaContext format ([43297f2](https://github.com/getvrex/glabs-sdk/commit/43297f28072d96177ae5dd91d90f70418a341086))
* VIDEO_GENERATION action + recaptchaContext for video service ([daf5bf5](https://github.com/getvrex/glabs-sdk/commit/daf5bf52a97db251ad6ce9131eb5a48d3db7088b))

## [1.4.0](https://github.com/getvrex/glabs-sdk/compare/v1.3.2...v1.4.0) (2026-01-03)


### Features

* **docs:** add Fumadocs documentation site ([e2360f8](https://github.com/getvrex/glabs-sdk/commit/e2360f858d38bc311c7a0e78945c590a2fdec858))
* **test:** add E2E test suite with CI integration ([5bc6de0](https://github.com/getvrex/glabs-sdk/commit/5bc6de0188fd35916e0c81c40ddf1d5090a077a3))


### Bug Fixes

* **docs:** improve code block with syntax highlighting and left align ([11837b1](https://github.com/getvrex/glabs-sdk/commit/11837b13c7b57451f34c0ea8fa64cad0fb4f842a))
* **docs:** use Railway PORT env var for serve ([039f201](https://github.com/getvrex/glabs-sdk/commit/039f2015487bbe6cc9e92fe200c052dfb5164a68))

## [1.3.2](https://github.com/getvrex/glabs-sdk/compare/v1.3.1...v1.3.2) (2025-12-28)


### Bug Fixes

* **recaptcha:** skip retry on failure when using static token ([0c42bbb](https://github.com/getvrex/glabs-sdk/commit/0c42bbbf199440471c51f5e7174d7c4578f42efc))

## [1.3.1](https://github.com/getvrex/glabs-sdk/compare/v1.3.0...v1.3.1) (2025-12-25)


### Bug Fixes

* **projects:** use sessionToken for project API authentication ([db23cb4](https://github.com/getvrex/glabs-sdk/commit/db23cb410dcdcbaebcb5221182a2ce0dbfd20db5))

## [1.3.0](https://github.com/getvrex/glabs-sdk/compare/v1.2.0...v1.3.0) (2025-12-25)


### Features

* **projects:** add ProjectService with auto-projectId resolution ([a297472](https://github.com/getvrex/glabs-sdk/commit/a2974726894acad754735dfafc6e032df482896d))

## [1.2.0](https://github.com/getvrex/glabs-sdk/compare/v1.1.0...v1.2.0) (2025-12-25)


### Features

* **recaptcha:** add staticToken option for direct token usage ([ddf57e4](https://github.com/getvrex/glabs-sdk/commit/ddf57e400e12aa3e52aba432a7e053a50996b4ff))

## [1.1.0](https://github.com/getvrex/glabs-sdk/compare/v1.0.1...v1.1.0) (2025-12-24)


### Features

* **playground:** add video upscale step (Test 5) ([51f9783](https://github.com/getvrex/glabs-sdk/commit/51f978309e64b05fd738189b216036585efc5d12))
* **recaptcha:** add custom, veo3solver, and regotcha providers ([56bf3d3](https://github.com/getvrex/glabs-sdk/commit/56bf3d316e2532d1c3809b7e215c386783edbf11))

## [1.0.1](https://github.com/getvrex/glabs-sdk/compare/v1.0.0...v1.0.1) (2025-12-19)


### Bug Fixes

* add author field ([a182962](https://github.com/getvrex/glabs-sdk/commit/a182962fcdb034cee3fa6d014812c92f9e24ec7c))

## 1.0.0 (2025-12-19)


### Features

* initialize glabs-sdk project with full claude workspace ([aee8eff](https://github.com/getvrex/glabs-sdk/commit/aee8effa199697f13a8a04d7783ec193ca167cf3))


### Bug Fixes

* **tsconfig:** add DOM lib to resolve console type errors ([8b64e7e](https://github.com/getvrex/glabs-sdk/commit/8b64e7e97cc5b88081e462675de69fdddd5fbc6c))
