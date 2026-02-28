import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-logo text-lg font-bold tracking-wider">
        <span className="text-primary">G</span>
        <span className="text-foreground">Labs</span>
        <span className="ml-1.5 text-xs font-mono text-muted-foreground">SDK</span>
      </span>
    ),
  },
  links: [
    {
      text: "Documentation",
      url: "/docs",
      active: "nested-url",
    },
    {
      text: "npm",
      url: "https://www.npmjs.com/package/@getvrex/glabs-sdk",
      external: true,
    },
    {
      text: "GitHub",
      url: "https://github.com/getvrex/glabs-sdk",
      external: true,
    },
  ],
  githubUrl: "https://github.com/getvrex/glabs-sdk",
};
