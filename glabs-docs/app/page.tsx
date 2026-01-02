import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-500/10 via-transparent to-blue-500/10" />

        <div className="max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
            <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              GLabs SDK
            </span>
          </h1>

          <p className="mb-8 text-xl text-muted-foreground">
            TypeScript SDK for Google Labs AI media generation APIs.
            <br />
            Generate stunning images with Imagen and videos with Veo.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/docs"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              href="https://github.com/getvrex/glabs-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              GitHub
            </Link>
          </div>
        </div>

        {/* Code snippet */}
        <div className="mt-16 w-full max-w-2xl overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
            <span className="text-xs text-muted-foreground">Quick Start</span>
          </div>
          <pre className="overflow-x-auto p-4 text-sm">
            <code className="text-foreground">{`import { GLabsClient } from '@getvrex/glabs-sdk';

const client = new GLabsClient({
  bearerToken: process.env.GLABS_BEARER_TOKEN,
  accountTier: 'pro',
  recaptcha: {
    provider: 'regotcha',
    apiKey: process.env.RECAPTCHA_API_KEY,
  },
});

// Generate an image
const result = await client.images.generate({
  prompt: 'A beautiful sunset over mountains',
  sessionId: GLabsClient.generateSessionId(),
  aspectRatio: '16:9',
});`}</code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              title="Image Generation"
              description="Generate AI images using Google's Imagen models with full control over aspect ratios, seeds, and references."
            />
            <FeatureCard
              title="Video Generation"
              description="Create videos with Veo - text-to-video, image-to-video, extend, camera control, and HD upscaling."
            />
            <FeatureCard
              title="Type-Safe"
              description="Full TypeScript support with exported types for all options and results."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-muted-foreground">
          <p>Built by Vrex</p>
          <div className="flex gap-4">
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link
              href="https://github.com/getvrex/glabs-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
