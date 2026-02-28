import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-500/10 via-transparent to-blue-500/10" />

        <div className="max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl font-logo tracking-wider">
            <span className="text-primary">G</span>
            <span className="text-foreground">Labs</span>
            <span className="ml-2 text-2xl md:text-3xl font-mono text-muted-foreground align-middle">SDK</span>
          </h1>

          <p className="mb-8 text-xl text-muted-foreground">
            TypeScript SDK and CLI for Google Labs AI media generation.
            <br />
            Generate stunning images with Imagen 4 and videos with Veo 3.1.
          </p>

          {/* Install snippet */}
          <div className="mb-8 inline-flex items-center gap-3 rounded-lg border bg-muted/50 px-5 py-2.5 font-mono text-sm">
            <span className="text-muted-foreground">$</span>
            <span>npm install -g @getvrex/glabs-cli</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/docs"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              href="https://www.npmjs.com/package/@getvrex/glabs-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              npm
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
        <div className="mt-16 w-full max-w-2xl overflow-hidden rounded-lg border bg-card text-left">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-2 text-xs text-muted-foreground">Quick Start</span>
          </div>
          <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
            <code>
              <span className="text-purple-400">import</span>
              <span className="text-foreground">{" { "}</span>
              <span className="text-yellow-300">GLabsClient</span>
              <span className="text-foreground">{" } "}</span>
              <span className="text-purple-400">from</span>
              <span className="text-green-400">{" '@getvrex/glabs-sdk'"}</span>
              <span className="text-foreground">;</span>
              {"\n\n"}
              <span className="text-purple-400">const</span>
              <span className="text-blue-300">{" client"}</span>
              <span className="text-foreground">{" = "}</span>
              <span className="text-purple-400">new</span>
              <span className="text-yellow-300">{" GLabsClient"}</span>
              <span className="text-foreground">{"({"}</span>
              {"\n"}
              <span className="text-foreground">{"  "}</span>
              <span className="text-blue-300">bearerToken</span>
              <span className="text-foreground">{": "}</span>
              <span className="text-blue-300">process</span>
              <span className="text-foreground">.</span>
              <span className="text-blue-300">env</span>
              <span className="text-foreground">.</span>
              <span className="text-blue-300">GLABS_BEARER_TOKEN</span>
              <span className="text-foreground">,</span>
              {"\n"}
              <span className="text-foreground">{"  "}</span>
              <span className="text-blue-300">accountTier</span>
              <span className="text-foreground">{": "}</span>
              <span className="text-green-400">{"'pro'"}</span>
              <span className="text-foreground">,</span>
              {"\n"}
              <span className="text-foreground">{"  "}</span>
              <span className="text-blue-300">recaptcha</span>
              <span className="text-foreground">{": {"}</span>
              {"\n"}
              <span className="text-foreground">{"    "}</span>
              <span className="text-blue-300">provider</span>
              <span className="text-foreground">{": "}</span>
              <span className="text-green-400">{"'chrome'"}</span>
              <span className="text-foreground">,</span>
              {"\n"}
              <span className="text-foreground">{"  },"}</span>
              {"\n"}
              <span className="text-foreground">{"});"}</span>
              {"\n\n"}
              <span className="text-gray-500">{"// Generate an image"}</span>
              {"\n"}
              <span className="text-purple-400">const</span>
              <span className="text-blue-300">{" result"}</span>
              <span className="text-foreground">{" = "}</span>
              <span className="text-purple-400">await</span>
              <span className="text-blue-300">{" client"}</span>
              <span className="text-foreground">.</span>
              <span className="text-blue-300">images</span>
              <span className="text-foreground">.</span>
              <span className="text-yellow-300">generate</span>
              <span className="text-foreground">{"({"}</span>
              {"\n"}
              <span className="text-foreground">{"  "}</span>
              <span className="text-blue-300">prompt</span>
              <span className="text-foreground">{": "}</span>
              <span className="text-green-400">{"'A beautiful sunset over mountains'"}</span>
              <span className="text-foreground">,</span>
              {"\n"}
              <span className="text-foreground">{"  "}</span>
              <span className="text-blue-300">sessionId</span>
              <span className="text-foreground">{": "}</span>
              <span className="text-yellow-300">GLabsClient</span>
              <span className="text-foreground">.</span>
              <span className="text-yellow-300">generateSessionId</span>
              <span className="text-foreground">{"(),"}</span>
              {"\n"}
              <span className="text-foreground">{"  "}</span>
              <span className="text-blue-300">aspectRatio</span>
              <span className="text-foreground">{": "}</span>
              <span className="text-green-400">{"'16:9'"}</span>
              <span className="text-foreground">,</span>
              {"\n"}
              <span className="text-foreground">{"});"}</span>
            </code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Image Generation"
              description="Imagen 4 with batch generation, 2K/4K upscaling, and reference images."
            />
            <FeatureCard
              title="Video Generation"
              description="Veo 3.1 text-to-video, image-to-video, extend, camera reshoot, and HD upscaling."
            />
            <FeatureCard
              title="CLI"
              description="Full terminal access. Generate images, videos, and run an OpenAI-compatible server."
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
            <Link href="/llms.txt" className="hover:text-foreground">
              llms.txt
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
