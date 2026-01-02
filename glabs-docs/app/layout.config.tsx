import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-semibold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
        GLabs SDK
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
      text: "GitHub",
      url: "https://github.com/getvrex/glabs-sdk",
      external: true,
    },
  ],
  githubUrl: "https://github.com/getvrex/glabs-sdk",
};
