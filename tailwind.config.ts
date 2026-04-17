import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0f1117",
          card: "#161b27",
          border: "#1e2535",
        },
        text: {
          primary: "#e2e8f0",
          muted: "#94a3b8",
          faint: "#475569",
        },
        accent: {
          teal: "#14b8a6",
          red: "#ef4444",
          amber: "#f59e0b",
          green: "#22c55e",
          blue: "#3b82f6",
          purple: "#a855f7",
        },
        chart: {
          ec2: "#3b82f6",
          rds: "#8b5cf6",
          s3: "#f59e0b",
          lambda: "#22c55e",
          elb: "#06b6d4",
          eks: "#f97316",
        },
        team: {
          platform: "#3b82f6",
          backend: "#8b5cf6",
          frontend: "#22c55e",
          data: "#f59e0b",
          security: "#ef4444",
          devops: "#06b6d4",
        },
      },
    },
  },
  plugins: [],
}

export default config